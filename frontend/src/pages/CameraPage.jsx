import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import s from './CameraPage.module.css';

const DURATIONS = [
  { label: '15ث', seconds: 15 },
  { label: '60ث', seconds: 60 },
  { label: '10د', seconds: 600 },
];

const CSS_FILTERS = [
  { name: 'عادي', value: 'none' },
  { name: 'حيوي', value: 'saturate(1.8) contrast(1.1)' },
  { name: 'بارد', value: 'hue-rotate(200deg) saturate(1.2)' },
  { name: 'دافئ', value: 'sepia(0.4) saturate(1.3)' },
  { name: 'أبيض وأسود', value: 'grayscale(1)' },
  { name: 'ناعم', value: 'brightness(1.1) contrast(0.9) saturate(0.8)' },
  { name: 'درامي', value: 'contrast(1.4) brightness(0.9)' },
];

export default function CameraPage() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const chunksRef = useRef([]);

  const [mode, setMode] = useState('منشور'); // منشور | LIVE | الإبداع
  const [postMode, setPostMode] = useState('video'); // video | photo
  const [facing, setFacing] = useState('user'); // user | environment
  const [filter, setFilter] = useState('none');
  const [showFilters, setShowFilters] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [timer, setTimer] = useState(0); // 0 | 3 | 10
  const [countdown, setCountdown] = useState(null);
  const [duration, setDuration] = useState(15);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraError, setCameraError] = useState(null);

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraError(null);
    } catch {
      setCameraError('تعذّر الوصول إلى الكاميرا. تأكد من منح الإذن.');
    }
  }, [facing]);

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      clearInterval(timerRef.current);
    };
  }, [startCamera]);

  const flipCamera = () => setFacing((f) => (f === 'user' ? 'environment' : 'user'));

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (filter !== 'none') {
      ctx.filter = filter;
    }
    if (facing === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      navigate('/edit-post', {
        state: { type: 'photo', files: [{ blob, url }], filter },
      });
    }, 'image/jpeg', 0.92);
  };

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      navigate('/edit-post', { state: { type: 'video', blob, url, filter } });
    };
    mediaRecorderRef.current = mr;
    mr.start(100);
    setRecording(true);
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime((t) => {
        if (t + 1 >= duration) {
          stopRecording();
          return t + 1;
        }
        return t + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const doTimer = () => {
    if (timer === 0) { doAction(); return; }
    let count = timer;
    setCountdown(count);
    const id = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(id);
        setCountdown(null);
        doAction();
      }
    }, 1000);
  };

  const doAction = () => {
    if (postMode === 'photo') capturePhoto();
    else recording ? stopRecording() : startRecording();
  };

  const openGallery = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const items = files.map((f) => ({ blob: f, url: URL.createObjectURL(f) }));
    const type = files[0].type.startsWith('video') ? 'video' : 'photo';
    navigate('/edit-post', {
      state: { type, files: type === 'photo' ? items : undefined, blob: type === 'video' ? files[0] : undefined, url: items[0].url },
    });
  };

  const progress = duration > 0 ? (recordingTime / duration) * 100 : 0;

  if (mode === 'LIVE') {
    navigate('/inbox');
    return null;
  }

  return (
    <div className={s.page}>
      {/* Camera preview */}
      <div className={s.preview}>
        {cameraError ? (
          <div className={s.error}>{cameraError}</div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={s.videoPreview}
            style={{
              filter: filter === 'none' ? undefined : filter,
              transform: facing === 'user' ? 'scaleX(-1)' : undefined,
            }}
          />
        )}

        {/* Countdown overlay */}
        {countdown !== null && (
          <div className={s.countdown}>{countdown}</div>
        )}

        {/* Recording progress ring */}
        {recording && (
          <div className={s.recordingBadge}>
            <span className={s.recDot} /> {recordingTime}s / {duration}s
          </div>
        )}
      </div>

      {/* Top bar */}
      <div className={s.topBar}>
        <button className={s.closeBtn} onClick={() => navigate(-1)}>✕</button>
        <div className={s.addSoundBtn} onClick={() => navigate('/edit-post', { state: { pickAudio: true } })}>
          <span>🎵</span> إضافة صوت
        </div>
        <div style={{ width: 40 }} />
      </div>

      {/* Left tools */}
      <div className={s.leftTools}>
        <ToolBtn icon="🔄" label="" onClick={flipCamera} />
        <ToolBtn icon={flashOn ? '⚡' : '✕'} label="" onClick={() => setFlashOn((v) => !v)} dim={!flashOn} />
        <div className={s.toolDivider} />
        <ToolBtn icon={timer === 0 ? '⏱' : `${timer}s`} label="" onClick={() => setTimer((t) => (t === 0 ? 3 : t === 3 ? 10 : 0))} />
        <ToolBtn icon="⊞" label="" onClick={() => {}} />
        <ToolBtn icon="✦" label="" onClick={() => setShowFilters((v) => !v)} />
        <ToolBtn icon="▼" label="" onClick={() => setShowFilters((v) => !v)} />
      </div>

      {/* Filter strip */}
      {showFilters && (
        <div className={s.filterStrip}>
          {CSS_FILTERS.map((f) => (
            <button
              key={f.name}
              className={`${s.filterItem} ${filter === f.value ? s.filterActive : ''}`}
              onClick={() => { setFilter(f.value); setShowFilters(false); }}
            >
              <div className={s.filterPreview} style={{ filter: f.value === 'none' ? undefined : f.value }} />
              <span>{f.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Bottom controls */}
      <div className={s.bottom}>
        {/* Duration selector (video only) */}
        {postMode === 'video' && (
          <div className={s.durations}>
            {DURATIONS.map((d) => (
              <button
                key={d.seconds}
                className={`${s.durBtn} ${duration === d.seconds ? s.durActive : ''}`}
                onClick={() => setDuration(d.seconds)}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}

        {/* Record + gallery row */}
        <div className={s.captureRow}>
          {/* Gallery picker */}
          <label className={s.galleryBtn}>
            <input
              type="file"
              multiple
              accept={postMode === 'photo' ? 'image/*' : 'video/*'}
              hidden
              onChange={openGallery}
            />
            🖼
          </label>

          {/* Record / capture button */}
          <div
            className={`${s.recordWrap} ${recording ? s.recordingWrap : ''}`}
            onClick={countdown === null ? doTimer : undefined}
            style={{ '--progress': `${progress}%` }}
          >
            <div className={`${s.recordBtn} ${postMode === 'photo' ? s.photoBtn : ''} ${recording ? s.recordingBtn : ''}`} />
          </div>

          <div style={{ width: 56 }} />
        </div>

        {/* Mode tabs: منشور / LIVE / الإبداع */}
        <div className={s.modeTabs}>
          {['الإبداع', 'LIVE', 'منشور'].map((m) => (
            <button
              key={m}
              className={`${s.modeTab} ${mode === m ? s.modeActive : ''}`}
              onClick={() => {
                if (m === 'LIVE') { navigate('/inbox'); return; }
                setMode(m);
                setPostMode(m === 'منشور' ? 'video' : 'photo');
              }}
            >
              {m}
            </button>
          ))}
          {/* Photo/Video sub-toggle inside منشور */}
          {mode === 'منشور' && (
            <div className={s.subMode}>
              <button className={`${s.subBtn} ${postMode === 'video' ? s.subActive : ''}`} onClick={() => setPostMode('video')}>فيديو</button>
              <button className={`${s.subBtn} ${postMode === 'photo' ? s.subActive : ''}`} onClick={() => setPostMode('photo')}>صورة</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToolBtn({ icon, label, onClick, dim }) {
  return (
    <button className={`${s.toolBtn} ${dim ? s.toolDim : ''}`} onClick={onClick}>
      <span>{icon}</span>
      {label && <span className={s.toolLabel}>{label}</span>}
    </button>
  );
}
