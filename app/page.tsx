"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Globe2, Mic, Play, RadioTower, Zap } from "lucide-react";

type GeoState = {
  country: string;
  language: "ru" | "en";
};

type RecentScream = {
  id: string;
  created_at: string;
  country_code: string | null;
  language: "ru" | "en";
  transcript: string | null;
  response: string;
  peak_volume: number | null;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onnomatch: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type LocalTranscriber = (
  audio: Float32Array,
  options: { task: "transcribe" }
) => Promise<{ text: string }>;

const RU_RESPONSES = [
  "Хули ты кричишь? Хотя ладно, продолжай.",
  "Ага, ещё поори. Интернет терпит.",
  "Норм ор. Соседи оценят, когда заведут канал.",
  "О, ещё один герой клавиатуры. Кричи, не стесняйся.",
  "Зачётный вопль. Почти терапия, только дешевле."
];

const EN_RESPONSES = [
  "Why are you screaming? Actually, keep going.",
  "Yeah, scream again. The internet can take it.",
  "Solid scream. Your neighbors are taking notes.",
  "Big feelings, small microphone.",
  "Good yell. Almost therapy, but with worse acoustics."
];

const RU_UNCLEAR_RESPONSES = [
  "Слов не понял. Крик засчитан.",
  "Речь не разобрал, но по громкости вопросов нет.",
  "Это было больше похоже на звук, чем на текст."
];

const EN_UNCLEAR_RESPONSES = [
  "No words detected. The scream still counts.",
  "I did not catch the speech, but the noise landed.",
  "That sounded more like a sound than a sentence."
];

const FALLBACK_RECENT: RecentScream[] = [
  {
    id: "seed-1",
    created_at: "2026-06-06T18:00:24.000Z",
    country_code: "RU",
    language: "ru",
    transcript: "ААААААААААААА!!!",
    response: "Норм ор. Соседи оценят.",
    peak_volume: 92
  },
  {
    id: "seed-2",
    created_at: "2026-06-06T17:59:22.000Z",
    country_code: "US",
    language: "en",
    transcript: "I HATE EVERYTHING!!!",
    response: "Big feelings, small microphone.",
    peak_volume: 87
  },
  {
    id: "seed-3",
    created_at: "2026-06-06T17:58:03.000Z",
    country_code: "DE",
    language: "en",
    transcript: "AAAAAAAAAAAA!!!",
    response: "Yeah, scream again. The internet can take it.",
    peak_volume: 81
  }
];

function pickResponse(language: "ru" | "en", seed: string) {
  const list = language === "ru" ? RU_RESPONSES : EN_RESPONSES;
  const score = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return list[score % list.length];
}

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }

  const speechWindow = window as Window &
    typeof globalThis & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };

  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function Waveform({ active, level }: { active: boolean; level: number }) {
  return (
    <div className="waveform" aria-hidden="true">
      {Array.from({ length: 72 }).map((_, index) => {
        const phase = Math.sin(index * 0.74) * 0.5 + 0.5;
        const jitter = Math.sin(index * 1.9) * 0.5 + 0.5;
        const height = 18 + phase * 58 + (active ? level * 90 * jitter : 0);
        return <span key={index} style={{ height: `${height}px`, opacity: active ? 0.95 : 0.45 }} />;
      })}
    </div>
  );
}

function formatTime(date: string) {
  return new Intl.DateTimeFormat("en", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(date));
}

export default function Home() {
  const [geo, setGeo] = useState<GeoState>({ country: "US", language: "en" });
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("Hold the button and give it something real.");
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(0);
  const [recent, setRecent] = useState<RecentScream[]>(FALLBACK_RECENT);
  const [supportMessage, setSupportMessage] = useState("");
  const [transcriptionStatus, setTranscriptionStatus] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const finalTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");
  const localTranscriberRef = useRef<Promise<LocalTranscriber> | null>(null);
  const peakRef = useRef(0);

  const isRussian = geo.language === "ru";
  const displayTranscript =
    transcript ||
    transcriptionStatus ||
    (isRussian ? "Зажми микрофон и ори сюда." : "Hold the mic and scream into this page.");

  const seoLine = isRussian ? "хочешь кричать? кричи здесь" : "want to scream? scream here";

  const copy = useMemo(
    () => ({
      hold: isRussian ? "ЗАЖМИ И ОРИ" : "HOLD TO SCREAM",
      live: isRussian ? "ЖИВАЯ РАСШИФРОВКА" : "LIVE TRANSCRIPTION",
      says: isRussian ? "САЙТ ОТВЕЧАЕТ" : "SCREAMER SAYS",
      today: isRussian ? "КРИКОВ СЕГОДНЯ" : "SCREAMS TODAY",
      peak: isRussian ? "ПИК ГРОМКОСТИ" : "PEAK VOLUME",
      online: isRussian ? "ОРУТ СЕЙЧАС" : "SCREAMERS ONLINE",
      recent: isRussian ? "НЕДАВНИЕ КРИКИ" : "RECENT SCREAMS",
      unsupported: isRussian
        ? "Локальная модель не смогла разобрать речь. Крик всё равно засчитан."
        : "The local speech model could not catch words. The scream still counts.",
      listening: isRussian ? "Слушаю речь. Говори или ори." : "Listening for speech. Talk or scream.",
      localModelLoading: isRussian
        ? "Гружу локальный распознаватель. Первый раз может быть медленно."
        : "Loading local speech recognizer. First run can be slow.",
      localModelWorking: isRussian ? "Расшифровываю локально..." : "Transcribing locally...",
      unclear: isRussian
        ? "Речь не разобрал. Попробуй сказать фразу чётче."
        : "No speech detected. Try saying a clearer phrase.",
      untranscribed: isRussian ? "без расшифровки" : "not transcribed"
    }),
    [isRussian]
  );

  const getLocalTranscriber = useCallback(() => {
    if (!localTranscriberRef.current) {
      const loadTransformers = new Function(
        "return import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2')"
      ) as () => Promise<{
        env: { allowLocalModels: boolean; allowRemoteModels: boolean };
        pipeline: (task: "automatic-speech-recognition", model: string) => Promise<LocalTranscriber>;
      }>;

      localTranscriberRef.current = loadTransformers().then(async ({ env, pipeline }) => {
        env.allowLocalModels = false;
        env.allowRemoteModels = true;
        const transcriber = await pipeline("automatic-speech-recognition", "Xenova/whisper-tiny");
        return transcriber as LocalTranscriber;
      });
    }

    return localTranscriberRef.current;
  }, []);

  const transcribeLocally = useCallback(
    async (audioBlob: Blob) => {
      if (!audioBlob.size) {
        return "";
      }

      setTranscriptionStatus(copy.localModelLoading);
      const [transcriber, audioBuffer] = await Promise.all([
        getLocalTranscriber(),
        audioBlob.arrayBuffer().then(async (buffer) => {
          const context = new AudioContext({ sampleRate: 16000 });
          try {
            return await context.decodeAudioData(buffer);
          } finally {
            context.close().catch(() => undefined);
          }
        })
      ]);

      setTranscriptionStatus(copy.localModelWorking);
      const audio = audioBuffer.getChannelData(0);
      const result = await transcriber(audio, {
        task: "transcribe"
      });

      return result.text.trim();
    },
    [copy.localModelLoading, copy.localModelWorking, getLocalTranscriber]
  );

  const loadRecent = useCallback(async () => {
    const result = await fetch("/api/screams", { cache: "no-store" });
    if (!result.ok) {
      return;
    }
    const body = (await result.json()) as { screams?: RecentScream[] };
    if (body.screams?.length) {
      setRecent(body.screams);
    }
  }, []);

  useEffect(() => {
    fetch("/api/geo", { cache: "no-store" })
      .then((result) => result.json())
      .then((body: GeoState) => {
        setGeo(body);
        setResponse(
          body.language === "ru"
            ? "Зажми кнопку. Сайт выдержит."
            : "Hold the button. This page can take it."
        );
      })
      .catch(() => undefined);

    loadRecent().catch(() => undefined);
  }, [loadRecent]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      audioContextRef.current?.close().catch(() => undefined);
    };
  }, []);

  const stopRecording = useCallback(async () => {
    setIsRecording(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      await new Promise((resolve) => window.setTimeout(resolve, 250));
    }

    const recordedBlob = await new Promise<Blob>((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(new Blob(recordedChunksRef.current, { type: "audio/webm" }));
        return;
      }

      recorder.onstop = () => {
        resolve(new Blob(recordedChunksRef.current, { type: recorder.mimeType || "audio/webm" }));
      };
      recorder.stop();
    });
    mediaRecorderRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
    setLevel(0);

    let recognizedTranscript = (finalTranscriptRef.current || transcript || interimTranscriptRef.current).trim();
    if (!recognizedTranscript) {
      recognizedTranscript = await transcribeLocally(recordedBlob).catch(() => {
        setSupportMessage(copy.unsupported);
        return "";
      });
    }

    const hasTranscript = recognizedTranscript.length > 0;
    const finalTranscript = hasTranscript ? recognizedTranscript : null;
    const unclearResponses = geo.language === "ru" ? RU_UNCLEAR_RESPONSES : EN_UNCLEAR_RESPONSES;
    const selectedResponse = hasTranscript
      ? pickResponse(geo.language, recognizedTranscript + peakRef.current.toFixed(2))
      : unclearResponses[Math.round(peakRef.current * 100) % unclearResponses.length];
    const durationMs = startedAt ? Date.now() - startedAt : null;

    setTranscriptionStatus(hasTranscript ? "" : copy.unclear);
    setTranscript(finalTranscript ?? "");
    setResponse(selectedResponse);

    await fetch("/api/screams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript: finalTranscript,
        response: selectedResponse,
        language: geo.language,
        countryCode: geo.country,
        peakVolume: Math.round(peakRef.current * 100),
        durationMs
      })
    }).catch(() => undefined);

    loadRecent().catch(() => undefined);
  }, [copy.unclear, copy.unsupported, geo.country, geo.language, loadRecent, startedAt, transcript, transcribeLocally]);

  const startRecording = useCallback(async () => {
    setSupportMessage("");
    setTranscript("");
    setTranscriptionStatus("");
    finalTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    recordedChunksRef.current = [];
    peakRef.current = 0;
    setPeak(0);
    setStartedAt(Date.now());

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    if (typeof MediaRecorder !== "undefined") {
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size) {
          recordedChunksRef.current.push(event.data);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
    }

    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const average = data.reduce((sum, value) => sum + value, 0) / data.length / 255;
      const nextLevel = Math.min(1, average * 2.6);
      peakRef.current = Math.max(peakRef.current, nextLevel);
      setLevel(nextLevel);
      setPeak(Math.round(peakRef.current * 100));
      animationRef.current = requestAnimationFrame(tick);
    };

    tick();

    const Recognition = getSpeechRecognition();
    if (Recognition) {
      const recognition = new Recognition();
      recognition.lang = isRussian ? "ru-RU" : "en-US";
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.onresult = (event) => {
        let interim = "";
        let finalText = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          if (result.isFinal) {
            finalText += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }
        if (finalText) {
          finalTranscriptRef.current = `${finalTranscriptRef.current} ${finalText}`.trim();
        }
        interimTranscriptRef.current = interim.trim();
        const nextTranscript = `${finalTranscriptRef.current} ${interim}`.trim();
        setTranscriptionStatus(nextTranscript ? "" : copy.listening);
        setTranscript(nextTranscript);
      };
      recognition.onerror = (event) => {
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setSupportMessage(copy.unsupported);
        }
      };
      recognition.onnomatch = () => {
        setTranscriptionStatus(copy.unclear);
      };
      recognition.onend = () => {
        recognitionRef.current = null;
      };
      recognitionRef.current = recognition;
      recognition.start();
      setTranscriptionStatus(copy.listening);
    } else {
      setTranscriptionStatus(copy.listening);
    }

    setResponse(isRussian ? "Ори. Я слушаю." : "Scream. I am listening.");
    setIsRecording(true);
  }, [copy.listening, copy.unclear, copy.unsupported, isRussian]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording().catch(() => undefined);
      return;
    }

    startRecording().catch(() => {
      setSupportMessage(
        isRussian
          ? "Микрофон не открылся. Разреши доступ в браузере и попробуй снова."
          : "Microphone did not open. Allow browser access and try again."
      );
    });
  }, [isRecording, isRussian, startRecording, stopRecording]);

  return (
    <main>
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Scream Here home">
          <span>SCREAM</span> HERE
        </Link>
        <p>{seoLine}</p>
        <div className="geo">
          <Globe2 size={20} />
          <span>{geo.language.toUpperCase()}</span>
          <i />
          <strong>{geo.country}</strong>
        </div>
      </header>

      <div className="console-grid">
        <section className="readout">
          <div className="label red-dot">{copy.live}</div>
          <h1>{displayTranscript}</h1>
          <div className="answer">
            <div>
              <div className="label green">
                <Zap size={16} />
                {copy.says}
              </div>
              <p>{response}</p>
              <small>
                {isRussian ? "ответ выбран по гео" : "response based on location"} ({geo.country})
              </small>
            </div>
            <div className="speaker" aria-hidden="true">
              )))
            </div>
          </div>
          {supportMessage ? <p className="support">{supportMessage}</p> : null}
        </section>

        <section className="scream-stage" aria-label="Scream recorder">
          <div className="stage-copy">
            <RadioTower size={18} />
            <span>{copy.hold}</span>
            <small>{isRussian ? "чем громче, тем честнее" : "the louder, the better"}</small>
          </div>

          <Waveform active={isRecording} level={level} />

          <button
            className={`mic-button ${isRecording ? "recording" : ""}`}
            type="button"
            onClick={toggleRecording}
            aria-pressed={isRecording}
          >
            <span className="meter" style={{ transform: `scale(${1 + level * 0.18})` }} />
            <Mic size={76} strokeWidth={2.3} />
            <strong>{isRecording ? (isRussian ? "Орёшь" : "Screaming") : copy.hold}</strong>
          </button>
        </section>
      </div>

      <section className="stats" aria-label="Scream stats">
        <div>
          <span>{copy.today}</span>
          <strong>{recent.length ? 3240 + recent.length : 3240}</strong>
        </div>
        <div>
          <span>{copy.peak}</span>
          <strong>{Math.max(peak, 68)} dB</strong>
        </div>
        <div>
          <span>{copy.online}</span>
          <strong>{isRecording ? 184 : 183}</strong>
        </div>
      </section>

      <section className="recent">
        <div className="recent-head">
          <div className="label red-dot">{copy.recent}</div>
          <span>{isRussian ? "ВСЕ КРИКИ" : "ALL SCREAMS"} →</span>
        </div>
        <div className="recent-list">
          {recent.map((item) => (
            <article key={item.id} className="recent-row">
              <time>{formatTime(item.created_at)}</time>
              <span className="country">{item.country_code ?? "??"}</span>
              <div className="mini-wave" aria-hidden="true">
                {Array.from({ length: 18 }).map((_, index) => (
                  <i key={index} style={{ height: `${8 + Math.abs(Math.sin(index * 1.7)) * 24}px` }} />
                ))}
              </div>
              <strong>{item.transcript || copy.untranscribed}</strong>
              <p>{item.response}</p>
              <button type="button" aria-label="Play scream preview">
                <Play size={18} fill="currentColor" />
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
