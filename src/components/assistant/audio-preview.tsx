"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { Play, Pause, Download, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AudioData {
  url: string
  duration: number
  format: string
  voice: string
}

interface AudioPreviewProps {
  /** JSON-stringified AudioData */
  content: string
  title: string
  isStreaming: boolean
}

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const

export function AudioPreview({ content, title, isStreaming }: AudioPreviewProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)

  const audioData = (() => {
    try {
      return JSON.parse(content) as AudioData
    } catch {
      return null
    }
  })()

  const [audioError, setAudioError] = useState<string | null>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onDurationChange = () => setDuration(audio.duration)
    const onEnded = () => setIsPlaying(false)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onError = () => {
      const err = audio.error
      console.error("[AudioPreview] Playback error:", err?.code, err?.message)
      setAudioError(err?.message ?? "Audio konnte nicht abgespielt werden")
    }

    audio.addEventListener("timeupdate", onTimeUpdate)
    audio.addEventListener("durationchange", onDurationChange)
    audio.addEventListener("ended", onEnded)
    audio.addEventListener("play", onPlay)
    audio.addEventListener("pause", onPause)
    audio.addEventListener("error", onError)

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate)
      audio.removeEventListener("durationchange", onDurationChange)
      audio.removeEventListener("ended", onEnded)
      audio.removeEventListener("play", onPlay)
      audio.removeEventListener("pause", onPause)
      audio.removeEventListener("error", onError)
    }
  }, [audioData?.url])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
  }, [isPlaying])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percent = Math.max(0, Math.min(1, x / rect.width))
    audio.currentTime = percent * duration
  }, [duration])

  const cyclePlaybackRate = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    const idx = PLAYBACK_RATES.indexOf(playbackRate as typeof PLAYBACK_RATES[number])
    const next = PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length]
    audio.playbackRate = next
    setPlaybackRate(next)
  }, [playbackRate])

  const handleDownload = useCallback(() => {
    if (!audioData?.url) return
    const a = document.createElement("a")
    a.href = audioData.url
    a.download = `${title}.wav`
    a.click()
  }, [audioData?.url, title])

  if (isStreaming) {
    return <AudioStreamingPlaceholder />
  }

  if (!audioData) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Audio-Daten konnten nicht geladen werden.
      </div>
    )
  }

  if (audioError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-muted-foreground text-sm">
        <Volume2 className="size-8 text-muted-foreground/50" />
        <p>{audioError}</p>
        <a
          href={audioData.url}
          download={`${title}.wav`}
          className="text-xs text-primary hover:underline"
        >
          Audio-Datei herunterladen
        </a>
      </div>
    )
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Volume2 className="size-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-sm truncate">{title}</h3>
            <p className="text-xs text-muted-foreground">
              Stimme: {audioData.voice} · {formatTime(audioData.duration)}
            </p>
          </div>
        </div>

        <div
          className="w-full h-2 bg-muted rounded-full cursor-pointer group mb-3"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-primary rounded-full transition-[width] duration-100 relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 size-3 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        <div className="flex justify-between text-xs text-muted-foreground mb-4">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration || audioData.duration)}</span>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs font-mono w-12"
            onClick={cyclePlaybackRate}
            title="Wiedergabegeschwindigkeit"
          >
            {playbackRate}x
          </Button>

          <Button
            variant="default"
            size="icon"
            className="size-12 rounded-full"
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause className="size-5" />
            ) : (
              <Play className="size-5 ml-0.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={handleDownload}
            title="Herunterladen"
          >
            <Download className="size-4" />
          </Button>
        </div>
      </div>

      <audio ref={audioRef} preload="metadata">
        <source src={audioData.url} type="audio/wav" />
      </audio>
    </div>
  )
}

function AudioStreamingPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-6 animate-pulse">
      <div className="size-12 rounded-full bg-muted flex items-center justify-center">
        <Volume2 className="size-6 text-muted-foreground" />
      </div>
      <div className="text-sm text-muted-foreground">Audio wird generiert…</div>
      <div className="w-48 h-2 bg-muted rounded-full" />
    </div>
  )
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}
