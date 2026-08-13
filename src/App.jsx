import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CloudRain,
  CloudSun,
  Crosshair,
  MapPin,
  SpeakerHigh,
  SpeakerSlash,
  SunHorizon,
} from "@phosphor-icons/react";
import { DriveCanvas } from "./DriveCanvas.jsx";
import { createAmbientEngine } from "./audio.js";

const WEATHER_LABELS = {
  0: "Clear sky",
  1: "Mostly clear",
  2: "Soft clouds",
  3: "Overcast",
  45: "Misty",
  48: "Misty",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Steady drizzle",
  56: "Icy drizzle",
  57: "Icy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Passing showers",
  81: "Rain showers",
  82: "Heavy showers",
  85: "Snow showers",
  86: "Snow showers",
  95: "Thunder nearby",
  96: "Thunderstorm",
  99: "Thunderstorm",
};

const INITIAL_WEATHER = {
  code: 1,
  temperature: 16,
  label: "Golden afternoon",
  place: "Melbourne",
  isDay: true,
  wind: 9,
  seed: 3185,
  status: "idle",
};

function prettifyPlace(timezone) {
  const city = timezone?.split("/").pop()?.replaceAll("_", " ");
  return city || "Somewhere peaceful";
}

function phaseForHour(hour, isDay = true) {
  if (!isDay || hour < 5 || hour >= 21) return "night";
  if (hour < 8) return "dawn";
  if (hour >= 17) return "golden";
  return "day";
}

function WeatherIcon({ code, phase }) {
  if (code >= 51) return <CloudRain weight="duotone" />;
  if (phase === "golden" || phase === "dawn") return <SunHorizon weight="duotone" />;
  return <CloudSun weight="duotone" />;
}

export function App() {
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [weather, setWeather] = useState(INITIAL_WEATHER);
  const [now, setNow] = useState(() => new Date());
  const audioRef = useRef(null);

  const phase = useMemo(
    () => phaseForHour(now.getHours(), weather.isDay),
    [now, weather.isDay],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => () => audioRef.current?.destroy(), []);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setWeather((current) => ({ ...current, status: "unsupported" }));
      return;
    }

    setWeather((current) => ({ ...current, status: "locating" }));
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const query = new URLSearchParams({
            latitude: coords.latitude.toFixed(4),
            longitude: coords.longitude.toFixed(4),
            current: "temperature_2m,weather_code,is_day,wind_speed_10m",
            timezone: "auto",
          });
          const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`);
          if (!response.ok) throw new Error("Weather request failed");
          const data = await response.json();
          const current = data.current;
          setWeather({
            code: current.weather_code,
            temperature: Math.round(current.temperature_2m),
            label: WEATHER_LABELS[current.weather_code] || "Changing skies",
            place: prettifyPlace(data.timezone),
            isDay: Boolean(current.is_day),
            wind: Math.round(current.wind_speed_10m),
            seed: Math.abs(Math.round(coords.latitude * 100 + coords.longitude * 10)),
            status: "ready",
          });
        } catch {
          setWeather((current) => ({
            ...current,
            status: "weather-unavailable",
            place: "Your horizon",
            label: "Weather unavailable",
          }));
        }
      },
      () => setWeather((current) => ({ ...current, status: "denied" })),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 15 * 60_000 },
    );
  }, []);

  const begin = useCallback(async () => {
    if (!audioRef.current) audioRef.current = createAmbientEngine();
    await audioRef.current.start();
    audioRef.current.setMuted(muted);
    setStarted(true);
    locate();
  }, [locate, muted]);

  const toggleMuted = useCallback(() => {
    setMuted((current) => {
      const next = !current;
      audioRef.current?.setMuted(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!started) return;
      if (event.key.toLowerCase() === "m") toggleMuted();
      if (event.key.toLowerCase() === "l") locate();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [locate, started, toggleMuted]);

  const statusText = weather.status === "locating"
    ? "Finding your sky…"
    : weather.status === "denied"
      ? "Location off · tap to retry"
      : `${weather.place} · ${weather.temperature}°`;

  return (
    <main className={`journey phase-${phase}`}>
      <DriveCanvas weather={weather} phase={phase} started={started} />

      <div className="grain" aria-hidden="true" />

      {!started && (
        <section className="welcome" aria-labelledby="welcome-title">
          <p className="eyebrow">An endless drive</p>
          <h1 id="welcome-title">Long Way</h1>
          <p className="welcome-copy">
            A quiet road shaped by the light and weather around you.
          </p>
          <button className="begin-button" type="button" onClick={begin}>
            Begin the drive
            <span aria-hidden="true">→</span>
          </button>
          <p className="permission-note">
            Uses your approximate location for local weather. Nothing is stored.
          </p>
        </section>
      )}

      <div className={`corner-mark ${started ? "is-visible" : ""}`} aria-hidden={!started}>
        <span>LONG WAY</span>
        <i />
      </div>

      <div className={`controls ${started ? "is-visible" : ""}`}>
        <button
          className="round-control"
          type="button"
          onClick={toggleMuted}
          aria-label={muted ? "Unmute ambient music" : "Mute ambient music"}
          aria-pressed={muted}
        >
          {muted ? <SpeakerSlash weight="fill" /> : <SpeakerHigh weight="fill" />}
        </button>

        <button
          className="weather-control"
          type="button"
          onClick={locate}
          aria-label={`${statusText}. ${weather.label}. Refresh location and weather.`}
        >
          <WeatherIcon code={weather.code} phase={phase} />
          <span>
            <strong>{statusText}</strong>
            <small>{weather.label} · {weather.wind} km/h</small>
          </span>
          {weather.status === "locating" ? (
            <Crosshair className="locating" weight="bold" />
          ) : (
            <MapPin weight="fill" />
          )}
        </button>
      </div>

      <p className="keyboard-hint">M to mute · L for local weather</p>
    </main>
  );
}
