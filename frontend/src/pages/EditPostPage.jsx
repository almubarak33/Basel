import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import s from './EditPostPage.module.css';

const FILTERS = [
  { nameKey: 'normal',   value: 'none' },
  { nameKey: 'vivid',    value: 'saturate(1.8) contrast(1.1)' },
  { nameKey: 'cool',     value: 'hue-rotate(200deg) saturate(1.2)' },
  { nameKey: 'warm',     value: 'sepia(0.4) saturate(1.3)' },
  { nameKey: 'bw',       value: 'grayscale(1)' },
  { nameKey: 'soft',     value: 'brightness(1.1) contrast(0.9) saturate(0.8)' },
  { nameKey: 'dramatic', value: 'contrast(1.4) brightness(0.9)' },
];

const VISIBILITY_KEYS = ['public', 'friends', 'private'];

// ── AI mood analysis via canvas color sampling ──────────────────────────────
const MOOD_MAP = [
  { moodKey: 'active',     genreKey: 'hiphop' },
  { moodKey: 'calm',       genreKey: 'ambient' },
  { moodKey: 'romantic',   genreKey: 'pop' },
  { moodKey: 'natural',    genreKey: 'acoustic' },
  { moodKey: 'mysterious', genreKey: 'indie' },
  { moodKey: 'bright',     genreKey: 'indie_pop' },
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
  const { t } = useTranslation();
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
      alert(t('edit_post.upload_failed'));
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
          <div className={s.emptyPreview}>{t('edit_post.no_media')}</div>
        )}

        {/* Top bar */}
        <div className={s.topBar}>
          <button className={s.backBtn} onClick={() => navigate(-1)}>‹</button>
          <span className={s.topTitle}>{t('edit_post.title')}</span>
          <button className={s.postBtn} onClick={handlePost} disabled={uploading}>
            {uploading ? `${uploadProgress}%` : t('edit_post.post_btn')}
          </button>
        </div>
      </div>

      {/* ── Tools strip ── */}
      <div className={s.tools}>
        <button className={s.toolChip} onClick={() => setShowFilters((v) => !v)}>{t('edit_post.filters')}</button>
        {isPhoto && (
          <label className={s.toolChip}>
            <input ref={addSlideRef} type="file" multiple accept="image/*" hidden onChange={addMoreSlides} />
            {t('edit_post.add_photos')}
          </label>
        )}
        <label className={s.toolChip}>
          <input ref={audioRef} type="file" accept="audio/*" hidden onChange={handleAudioPick} />
          {audioName ? audioName.slice(0, 14) + (audioName.length > 14 ? '…' : '') : t('edit_post.add_sound')}
        </label>
        {!isPhoto && videoDuration > 0 && (
          <button className={`${s.toolChip} ${showTrim ? s.toolChipActive : ''}`} onClick={() => setShowTrim((v) => !v)}>
            {t('edit_post.trim')}
          </button>
        )}
      </div>

      {/* ── Filter strip ── */}
      {showFilters && (
        <div className={s.filterStrip}>
          {FILTERS.map((f) => (
            <button
              key={f.nameKey}
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
              <span>{t(`camera.filter_${f.nameKey}`)}</span>
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
            <span className={s.sliderLabel}>{t('edit_post.trim_start')}</span>
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
            <span className={s.sliderLabel}>{t('edit_post.trim_end')}</span>
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
          <div className={s.aiLabel}>{t('edit_post.ai_suggestion')}</div>
          {aiAnalyzing ? (
            <div className={s.aiLoading}>{t('edit_post.analyzing')}</div>
          ) : (
            <div className={s.aiContent}>
              <div className={s.aiMood}>{t(`edit_post.mood_${aiMood.moodKey}`)}</div>
              <div className={s.aiGenre}>{t('edit_post.suitable_music')} <strong>{t(`edit_post.genre_${aiMood.genreKey}`)}</strong></div>
              {!audioName ? (
                <label className={s.aiPickBtn}>
                  <input type="file" accept="audio/*" hidden onChange={handleAudioPick} />
                  {t('edit_post.add_suitable_sound')}
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
          placeholder={t('edit_post.caption_placeholder')}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={300}
          rows={3}
        />

        <div className={s.field}>
          <span className={s.fieldLabel}>{t('edit_post.privacy')}</span>
          <div className={s.visOpts}>
            {VISIBILITY_KEYS.map((k) => (
              <button
                key={k}
                className={`${s.visBtn} ${visibility === k ? s.visActive : ''}`}
                onClick={() => setVisibility(k)}
              >
                {t(`edit_post.${k}`)}
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
          {uploading ? `${t('edit_post.uploading')} ${uploadProgress}%` : t('edit_post.post_content')}
        </button>
      </div>
    </div>
  );
}
