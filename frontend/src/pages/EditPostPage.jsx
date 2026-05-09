import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import s from './EditPostPage.module.css';

const FILTERS = [
  { name: 'عادي', value: 'none' },
  { name: 'حيوي', value: 'saturate(1.8) contrast(1.1)' },
  { name: 'بارد', value: 'hue-rotate(200deg) saturate(1.2)' },
  { name: 'دافئ', value: 'sepia(0.4) saturate(1.3)' },
  { name: 'أبيض وأسود', value: 'grayscale(1)' },
  { name: 'ناعم', value: 'brightness(1.1) contrast(0.9) saturate(0.8)' },
  { name: 'درامي', value: 'contrast(1.4) brightness(0.9)' },
];

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'عام 🌐' },
  { value: 'friends', label: 'الأصدقاء 👥' },
  { value: 'private', label: 'خاص 🔒' },
];

// ── AI mood analysis via canvas color sampling ──────────────────────────────
const MOOD_MAP = [
  { mood: 'نشيط 🔥',    genre: 'هيب هوب / إلكترونيك' },
  { mood: 'هادئ 🌊',    genre: 'أمبيانت / لو-فاي' },
  { mood: 'رومانسي 💖', genre: 'بوب / R&B' },
  { mood: 'طبيعي 🌿',   genre: 'أكوستيك / فولك' },
  { mood: 'غامض 🌙',    genre: 'إندي / دراما' },
  { mood: 'مشرق ☀️',   genre: 'بوب صاخب / إندي بوب' },
];

function analyzeImageMood(canvas) {
  const ctx = canvas.getContext('2d');
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let r = 0, g = 0, b = 0, brightness = 0;
  const pixels = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i]; g += data[i + 1]; b += data[i + 2];
    brightness += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }
  r /= pixels; g /= pixels; b /= pixels; brightness /= pixels;
  const max = Math.max(r, g, b);
  if (brightness > 180) return MOOD_MAP[5];
  if (brightness < 60)  return MOOD_MAP[4];
  if (max === r && r - g > 40) return MOOD_MAP[0];
  if (max === b && b - r > 30) return MOOD_MAP[1];
  if (r > 150 && b > 120 && g < 120) return MOOD_MAP[2];
  if (max === g && g - r > 30) return MOOD_MAP[3];
  return MOOD_MAP[0];
}

function loadImageToCanvas(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(img.naturalWidth, 100);
      canvas.height = Math.min(img.naturalHeight, 100);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas);
    };
    img.src = src;
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s_ = Math.floor(sec % 60);
  return `${m}:${String(s_).padStart(2, '0')}`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function EditPostPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};

  // Media state
  const [slides, setSlides] = useState(state.type === 'photo' && state.files ? state.files : []);
  const [videoBlob] = useState(state.type === 'video' ? state.blob : null);
  const [videoUrl]  = useState(state.type === 'video' ? state.url  : null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const isPhoto = state.type === 'photo';

  // Editing state
  const [caption, setCaption] = useState('');
  const [filter, setFilter] = useState(state.filter || 'none');
  const [visibility, setVisibility] = useState('public');
  const [showFilters, setShowFilters] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [audioName, setAudioName] = useState('');

  // AI mood
  const [aiMood, setAiMood] = useState(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  // Upload
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ── Video trim state ────────────────────────────────────────────────────────
  const videoRef = useRef(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showTrim, setShowTrim] = useState(false);
  const rafRef = useRef(null);

  // When video loads, set duration and default trim
  const onVideoLoaded = (e) => {
    const dur = e.target.duration;
    if (dur && isFinite(dur)) {
      setVideoDuration(dur);
      setTrimEnd(dur);
    }
  };

  // Loop within trim range using rAF
  useEffect(() => {
    if (!isPlaying || !videoRef.current) return;
    const check = () => {
      const v = videoRef.current;
      if (!v) return;
      const ct = v.currentTime;
      setCurrentTime(ct);
      if (ct >= trimEnd) {
        v.currentTime = trimStart;
      }
      rafRef.current = requestAnimationFrame(check);
    };
    rafRef.current = requestAnimationFrame(check);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, trimStart, trimEnd]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) {
      v.pause();
      setIsPlaying(false);
    } else {
      v.currentTime = trimStart;
      v.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // Seek when trim handles change
  const handleTrimStartChange = (e) => {
    const val = Math.min(Number(e.target.value), trimEnd - 0.5);
    setTrimStart(val);
    if (videoRef.current) videoRef.current.currentTime = val;
  };

  const handleTrimEndChange = (e) => {
    const val = Math.max(Number(e.target.value), trimStart + 0.5);
    setTrimEnd(val);
  };

  // Trim range as % for the visual bar
  const trimStartPct = videoDuration > 0 ? (trimStart / videoDuration) * 100 : 0;
  const trimEndPct   = videoDuration > 0 ? (trimEnd   / videoDuration) * 100 : 100;
  const playPct      = videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0;

  // ── Refs ────────────────────────────────────────────────────────────────────
  const addSlideRef = useRef();
  const audioRef = useRef();

  // AI analysis on first image
  useEffect(() => {
    const firstUrl = slides[0]?.url;
    if (!firstUrl) return;
    setAiAnalyzing(true);
    loadImageToCanvas(firstUrl)
      .then((canvas) => setAiMood(analyzeImageMood(canvas)))
      .catch(() => {})
      .finally(() => setAiAnalyzing(false));
  }, [slides]);

  // ── Slide helpers ────────────────────────────────────────────────────────────
  const addMoreSlides = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const items = files.map((f) => ({ blob: f, url: URL.createObjectURL(f) }));
    setSlides((prev) => [...prev, ...items]);
  };

  const removeSlide = (idx) => {
    setSlides((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (currentSlide >= next.length) setCurrentSlide(Math.max(0, next.length - 1));
      return next;
    });
  };

  const handleAudioPick = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setAudioFile(f);
    setAudioName(f.name);
  };

  // ── Upload ────────────────────────────────────────────────────────────────────
  const handlePost = useCallback(async () => {
    if (uploading) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const form = new FormData();
      form.append('caption', caption);
      form.append('visibility', visibility);

      if (isPhoto && slides.length > 0) {
        form.append('post_type', 'photo');
        slides.forEach((sl) => form.append('slides', sl.blob));
      } else if (!isPhoto && videoBlob) {
        form.append('post_type', 'video');
        form.append('video_file', videoBlob, 'video.webm');
        if (audioFile) form.append('audio_file', audioFile);
        // Send trim points so backend can cut with ffmpeg
        form.append('trim_start', String(trimStart));
        form.append('trim_end',   String(trimEnd));
      }

      await api.post('/videos/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      navigate('/', { replace: true });
    } catch {
      alert('فشل الرفع. حاول مرة أخرى.');
    } finally {
      setUploading(false);
    }
  }, [uploading, caption, visibility, isPhoto, slides, videoBlob, audioFile, trimStart, trimEnd, navigate]);

  const mediaUrl = isPhoto ? slides[currentSlide]?.url : videoUrl;

  return (
    <div className={s.page}>
      {/* ── Preview ── */}
      <div className={s.preview}>
        {isPhoto && slides.length > 0 ? (
          <>
            <img
              src={slides[currentSlide]?.url}
              alt=""
              className={s.previewImg}
              style={{ filter: filter === 'none' ? undefined : filter }}
            />
            {slides.length > 1 && (
              <div className={s.dots}>
                {slides.map((_, i) => (
                  <span key={i} className={`${s.dot} ${i === currentSlide ? s.dotActive : ''}`} onClick={() => setCurrentSlide(i)} />
                ))}
              </div>
            )}
            {slides.length > 1 && currentSlide > 0 && (
              <button className={`${s.arrow} ${s.arrowLeft}`} onClick={() => setCurrentSlide((i) => i - 1)}>‹</button>
            )}
            {slides.length > 1 && currentSlide < slides.length - 1 && (
              <button className={`${s.arrow} ${s.arrowRight}`} onClick={() => setCurrentSlide((i) => i + 1)}>›</button>
            )}
            <button className={s.removeSlide} onClick={() => removeSlide(currentSlide)}>✕</button>
          </>
        ) : !isPhoto && videoUrl ? (
          <>
            <video
              ref={videoRef}
              src={videoUrl}
              className={s.previewVideo}
              style={{ filter: filter === 'none' ? undefined : filter }}
              playsInline
              onLoadedMetadata={onVideoLoaded}
              onClick={togglePlay}
            />
            {/* Play/pause overlay */}
            {!isPlaying && (
              <div className={s.playOverlay} onClick={togglePlay}>▶</div>
            )}
          </>
        ) : (
          <div className={s.emptyPreview}>لا يوجد وسائط</div>
        )}

        {/* Top bar */}
        <div className={s.topBar}>
          <button className={s.backBtn} onClick={() => navigate(-1)}>‹</button>
          <span className={s.topTitle}>تعديل</span>
          <button className={s.postBtn} onClick={handlePost} disabled={uploading}>
            {uploading ? `${uploadProgress}%` : 'نشر'}
          </button>
        </div>
      </div>

      {/* ── Tools strip ── */}
      <div className={s.tools}>
        <button className={s.toolChip} onClick={() => setShowFilters((v) => !v)}>✦ فلاتر</button>
        {isPhoto && (
          <label className={s.toolChip}>
            <input ref={addSlideRef} type="file" multiple accept="image/*" hidden onChange={addMoreSlides} />
            + إضافة صور
          </label>
        )}
        <label className={s.toolChip}>
          <input ref={audioRef} type="file" accept="audio/*" hidden onChange={handleAudioPick} />
          🎵 {audioName ? audioName.slice(0, 14) + (audioName.length > 14 ? '…' : '') : 'إضافة صوت'}
        </label>
        {!isPhoto && videoDuration > 0 && (
          <button className={`${s.toolChip} ${showTrim ? s.toolChipActive : ''}`} onClick={() => setShowTrim((v) => !v)}>
            ✂️ قطع
          </button>
        )}
      </div>

      {/* ── Filter strip ── */}
      {showFilters && (
        <div className={s.filterStrip}>
          {FILTERS.map((f) => (
            <button
              key={f.name}
              className={`${s.filterItem} ${filter === f.value ? s.filterActive : ''}`}
              onClick={() => { setFilter(f.value); setShowFilters(false); }}
            >
              <div
                className={s.filterThumb}
                style={{
                  backgroundImage: mediaUrl ? `url(${mediaUrl})` : undefined,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  filter: f.value === 'none' ? undefined : f.value,
                }}
              />
              <span>{f.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Video Trim UI ── */}
      {!isPhoto && showTrim && videoDuration > 0 && (
        <div className={s.trimBox}>
          <div className={s.trimHeader}>
            <button className={s.trimPlayBtn} onClick={togglePlay}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <span className={s.trimTime}>{fmtTime(trimStart)} — {fmtTime(trimEnd)}</span>
            <span className={s.trimDuration}>({fmtTime(trimEnd - trimStart)})</span>
          </div>

          {/* Visual range bar */}
          <div className={s.trimTrack}>
            {/* inactive left */}
            <div className={s.trimInactive} style={{ width: `${trimStartPct}%` }} />
            {/* active range */}
            <div
              className={s.trimActive}
              style={{ left: `${trimStartPct}%`, width: `${trimEndPct - trimStartPct}%` }}
            />
            {/* inactive right */}
            <div className={s.trimInactive} style={{ left: `${trimEndPct}%`, right: 0 }} />
            {/* playhead */}
            <div className={s.playhead} style={{ left: `${playPct}%` }} />
          </div>

          {/* Start slider */}
          <div className={s.sliderRow}>
            <span className={s.sliderLabel}>بداية</span>
            <input
              type="range"
              className={s.trimSlider}
              min={0}
              max={videoDuration}
              step={0.1}
              value={trimStart}
              onChange={handleTrimStartChange}
            />
            <span className={s.sliderVal}>{fmtTime(trimStart)}</span>
          </div>

          {/* End slider */}
          <div className={s.sliderRow}>
            <span className={s.sliderLabel}>نهاية</span>
            <input
              type="range"
              className={s.trimSlider}
              min={0}
              max={videoDuration}
              step={0.1}
              value={trimEnd}
              onChange={handleTrimEndChange}
            />
            <span className={s.sliderVal}>{fmtTime(trimEnd)}</span>
          </div>
        </div>
      )}

      {/* ── AI Mood card (photo only) ── */}
      {isPhoto && (aiAnalyzing || aiMood) && (
        <div className={s.aiCard}>
          <div className={s.aiLabel}>🤖 اقتراح ذكي</div>
          {aiAnalyzing ? (
            <div className={s.aiLoading}>جارٍ تحليل الصورة…</div>
          ) : (
            <div className={s.aiContent}>
              <div className={s.aiMood}>{aiMood.mood}</div>
              <div className={s.aiGenre}>يناسبها: <strong>{aiMood.genre}</strong></div>
              {!audioName ? (
                <label className={s.aiPickBtn}>
                  <input type="file" accept="audio/*" hidden onChange={handleAudioPick} />
                  أضف صوت مناسب ↗
                </label>
              ) : (
                <div className={s.audioSelected}>✓ {audioName.slice(0, 20)}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Caption + settings ── */}
      <div className={s.form}>
        <textarea
          className={s.caption}
          placeholder="أضف وصفاً... #وسوم"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={300}
          rows={3}
        />

        <div className={s.field}>
          <span className={s.fieldLabel}>الخصوصية</span>
          <div className={s.visOpts}>
            {VISIBILITY_OPTIONS.map((o) => (
              <button
                key={o.value}
                className={`${s.visBtn} ${visibility === o.value ? s.visActive : ''}`}
                onClick={() => setVisibility(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {uploading && (
          <div className={s.progressBar}>
            <div className={s.progressFill} style={{ width: `${uploadProgress}%` }} />
          </div>
        )}

        <button
          className={s.submitBtn}
          onClick={handlePost}
          disabled={uploading || (!videoBlob && slides.length === 0)}
        >
          {uploading ? `جاري الرفع ${uploadProgress}%` : 'نشر المنشور'}
        </button>
      </div>
    </div>
  );
}
