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

// AI: dominant-color → mood → genre/style suggestion
const MOOD_MAP = [
  { mood: 'نشيط 🔥',   genre: 'هيب هوب / إلكترونيك',   keywords: ['energetic', 'red', 'orange'] },
  { mood: 'هادئ 🌊',   genre: 'أمبيانت / لو-فاي',       keywords: ['calm', 'blue', 'cyan'] },
  { mood: 'رومانسي 💖', genre: 'بوب / R&B',              keywords: ['romantic', 'pink', 'purple'] },
  { mood: 'طبيعي 🌿',  genre: 'أكوستيك / فولك',         keywords: ['nature', 'green'] },
  { mood: 'غامض 🌙',   genre: 'إندي / دراما',           keywords: ['dark', 'mysterious'] },
  { mood: 'مشرق ☀️',  genre: 'بوب صاخب / إندي بوب',   keywords: ['bright', 'yellow'] },
];

function analyzeImageMood(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;

  let r = 0, g = 0, b = 0, brightness = 0;
  const pixels = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    brightness += (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
  }
  r = r / pixels; g = g / pixels; b = b / pixels;
  brightness = brightness / pixels;

  // Classify dominant tone
  const max = Math.max(r, g, b);
  if (brightness > 180) return MOOD_MAP[5]; // bright
  if (brightness < 60)  return MOOD_MAP[4]; // dark/mysterious
  if (max === r && r - g > 40) return MOOD_MAP[0]; // warm/energetic
  if (max === b && b - r > 30) return MOOD_MAP[1]; // calm/cool
  if (r > 150 && b > 120 && g < 120) return MOOD_MAP[2]; // romantic pink/purple
  if (max === g && g - r > 30) return MOOD_MAP[3]; // nature green
  return MOOD_MAP[0]; // default energetic
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

export default function EditPostPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};
  // state: { type: 'photo'|'video', files: [{blob,url}], blob, url, filter, pickAudio }

  const [slides, setSlides] = useState(
    state.type === 'photo' && state.files ? state.files : []
  );
  const [videoBlob] = useState(state.type === 'video' ? state.blob : null);
  const [videoUrl] = useState(state.type === 'video' ? state.url : null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const [caption, setCaption] = useState('');
  const [filter, setFilter] = useState(state.filter || 'none');
  const [visibility, setVisibility] = useState('public');
  const [showFilters, setShowFilters] = useState(false);

  const [aiMood, setAiMood] = useState(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  const [audioFile, setAudioFile] = useState(null);
  const [audioName, setAudioName] = useState('');

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const addSlideRef = useRef();
  const audioRef = useRef();

  // Run AI analysis on first image
  useEffect(() => {
    const firstUrl = slides[0]?.url;
    if (!firstUrl) return;
    setAiAnalyzing(true);
    loadImageToCanvas(firstUrl)
      .then((canvas) => {
        const mood = analyzeImageMood(canvas);
        setAiMood(mood);
      })
      .catch(() => {})
      .finally(() => setAiAnalyzing(false));
  }, [slides]);

  const addMoreSlides = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const newItems = files.map((f) => ({ blob: f, url: URL.createObjectURL(f) }));
    setSlides((prev) => [...prev, ...newItems]);
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

  const handlePost = useCallback(async () => {
    if (uploading) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const form = new FormData();
      form.append('caption', caption);
      form.append('visibility', visibility);

      if (state.type === 'photo' && slides.length > 0) {
        form.append('post_type', 'photo');
        slides.forEach((sl) => form.append('slides', sl.blob));
      } else if (state.type === 'video' && videoBlob) {
        form.append('post_type', 'video');
        form.append('video_file', videoBlob, 'video.webm');
        if (audioFile) form.append('audio_file', audioFile);
      }

      await api.post('/videos/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });

      navigate('/', { replace: true });
    } catch (err) {
      alert('فشل الرفع. حاول مرة أخرى.');
    } finally {
      setUploading(false);
    }
  }, [uploading, caption, visibility, state.type, slides, videoBlob, audioFile, navigate]);

  const isPhoto = state.type === 'photo';
  const mediaUrl = isPhoto ? slides[currentSlide]?.url : videoUrl;

  return (
    <div className={s.page}>
      {/* Preview area */}
      <div className={s.preview}>
        {isPhoto && slides.length > 0 ? (
          <>
            <img
              src={slides[currentSlide]?.url}
              alt=""
              className={s.previewImg}
              style={{ filter: filter === 'none' ? undefined : filter }}
            />
            {/* Slide dots */}
            {slides.length > 1 && (
              <div className={s.dots}>
                {slides.map((_, i) => (
                  <span
                    key={i}
                    className={`${s.dot} ${i === currentSlide ? s.dotActive : ''}`}
                    onClick={() => setCurrentSlide(i)}
                  />
                ))}
              </div>
            )}
            {/* Slide nav arrows */}
            {slides.length > 1 && (
              <>
                {currentSlide > 0 && (
                  <button className={`${s.arrow} ${s.arrowLeft}`} onClick={() => setCurrentSlide((i) => i - 1)}>‹</button>
                )}
                {currentSlide < slides.length - 1 && (
                  <button className={`${s.arrow} ${s.arrowRight}`} onClick={() => setCurrentSlide((i) => i + 1)}>›</button>
                )}
              </>
            )}
            {/* Remove slide button */}
            <button className={s.removeSlide} onClick={() => removeSlide(currentSlide)}>✕</button>
          </>
        ) : !isPhoto && videoUrl ? (
          <video
            src={videoUrl}
            className={s.previewVideo}
            style={{ filter: filter === 'none' ? undefined : filter }}
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <div className={s.emptyPreview}>لا يوجد وسائط</div>
        )}

        {/* Top bar */}
        <div className={s.topBar}>
          <button className={s.backBtn} onClick={() => navigate(-1)}>‹</button>
          <span className={s.topTitle}>تعديل</span>
          <button
            className={s.postBtn}
            onClick={handlePost}
            disabled={uploading}
          >
            {uploading ? `${uploadProgress}%` : 'نشر'}
          </button>
        </div>
      </div>

      {/* Tools strip */}
      <div className={s.tools}>
        {/* Filters */}
        <button className={s.toolChip} onClick={() => setShowFilters((v) => !v)}>
          ✦ فلاتر
        </button>

        {/* Add more slides (photo only) */}
        {isPhoto && (
          <label className={s.toolChip}>
            <input ref={addSlideRef} type="file" multiple accept="image/*" hidden onChange={addMoreSlides} />
            + إضافة صور
          </label>
        )}

        {/* Add audio */}
        <label className={s.toolChip}>
          <input ref={audioRef} type="file" accept="audio/*" hidden onChange={handleAudioPick} />
          🎵 {audioName ? audioName.slice(0, 14) + (audioName.length > 14 ? '…' : '') : 'إضافة صوت'}
        </label>
      </div>

      {/* Filter strip */}
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
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: f.value === 'none' ? undefined : f.value,
                }}
              />
              <span>{f.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* AI Mood card */}
      {isPhoto && (aiAnalyzing || aiMood) && (
        <div className={s.aiCard}>
          <div className={s.aiLabel}>🤖 اقتراح ذكي</div>
          {aiAnalyzing ? (
            <div className={s.aiLoading}>جارٍ تحليل الصورة…</div>
          ) : (
            <div className={s.aiContent}>
              <div className={s.aiMood}>{aiMood.mood}</div>
              <div className={s.aiGenre}>يناسبها: <strong>{aiMood.genre}</strong></div>
              {!audioName && (
                <label className={s.aiPickBtn}>
                  <input type="file" accept="audio/*" hidden onChange={handleAudioPick} />
                  أضف صوت مناسب ↗
                </label>
              )}
              {audioName && (
                <div className={s.audioSelected}>✓ {audioName.slice(0, 20)}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Caption + settings */}
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
