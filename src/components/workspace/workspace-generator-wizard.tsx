"use client"

import { useState, useCallback } from "react"
import { Loader2, ArrowRight, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface Question {
  key: string
  label: string
  options: string[]
}

interface ExpertWizardResult {
  type: "expert"
  name: string
  slug: string
  description: string
  systemPrompt: string
}

interface SkillWizardResult {
  type: "skill"
  content: string
}

export type WizardResult = ExpertWizardResult | SkillWizardResult

interface WorkspaceGeneratorWizardProps {
  type: "expert" | "skill"
  onComplete: (result: WizardResult) => void
  initialDescription?: string
}

type WizardStep = "describe" | "loading-questions" | "questions" | "generating"

export function WorkspaceGeneratorWizard({ type, onComplete, initialDescription }: WorkspaceGeneratorWizardProps) {
  const [step, setStep] = useState<WizardStep>("describe")
  const [description, setDescription] = useState(initialDescription ?? "")
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [note, setNote] = useState("")
  const [error, setError] = useState("")

  const typeLabel = type === "expert" ? "Expert" : "Skill"

  const fetchQuestions = useCallback(async () => {
    setStep("loading-questions")
    setError("")

    try {
      const res = await fetch("/api/workspace/generate/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, description }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Anfrage fehlgeschlagen")
      }

      const data = await res.json()
      setQuestions(data.questions)
      // Pre-select first option for each question
      const defaultAnswers: Record<string, string> = {}
      for (const q of data.questions) {
        defaultAnswers[q.key] = q.options[0]
      }
      setAnswers(defaultAnswers)
      setStep("questions")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rueckfragen konnten nicht generiert werden.")
      setStep("describe")
    }
  }, [type, description])

  const generate = useCallback(async () => {
    setStep("generating")
    setError("")

    try {
      const finalAnswers = note.trim()
        ? { ...answers, _anmerkung: note.trim() }
        : answers

      const res = await fetch("/api/workspace/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, description, answers: finalAnswers }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Generierung fehlgeschlagen")
      }

      const data = await res.json()
      onComplete(data as WizardResult)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generierung fehlgeschlagen.")
      setStep("questions")
    }
  }, [type, description, answers, onComplete])

  // Step: Describe
  if (step === "describe") {
    return (
      <div className="space-y-4 max-w-2xl">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Beschreib deinen {typeLabel}</h2>
          <p className="text-sm text-muted-foreground">
            {type === "expert"
              ? "Was soll dein Expert koennen? Fuer welche Aufgaben brauchst du ihn?"
              : "Was soll dein Skill abdecken? Welches Wissen oder welche Methodik soll er bereitstellen?"
            }
          </p>
        </div>

        <Textarea
          value={description}
          onChange={(e) => { setDescription(e.target.value); setError("") }}
          placeholder={type === "expert"
            ? "z.B. Ich brauche einen Expert der mir bei der Erstellung von Angeboten hilft. Er soll formell aber nicht steif schreiben und typische Agentur-Angebote kennen."
            : "z.B. Ein Skill fuer strukturierte Kundenfeedback-Analyse. Er soll Feedback nach Themen clustern und Prioritaeten ableiten."
          }
          className="min-h-[120px]"
          maxLength={2000}
          autoFocus
        />

        {error && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        <Button
          onClick={fetchQuestions}
          disabled={description.trim().length < 10}
        >
          Weiter
          <ArrowRight className="ml-1.5 size-4" />
        </Button>
      </div>
    )
  }

  // Step: Loading questions
  if (step === "loading-questions") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 max-w-2xl">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Analysiere deine Beschreibung...</p>
      </div>
    )
  }

  // Step: Questions
  if (step === "questions") {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Noch {questions.length} kurze Fragen</h2>
          <p className="text-sm text-muted-foreground">
            Damit der {typeLabel} besser zu deinen Anforderungen passt.
          </p>
        </div>

        {questions.map((q) => (
          <div key={q.key} className="space-y-2">
            <Label>{q.label}</Label>
            <RadioGroup
              value={answers[q.key] ?? ""}
              onValueChange={(val) => setAnswers(prev => ({ ...prev, [q.key]: val }))}
              className="space-y-1.5"
            >
              {q.options.map((option) => (
                <div key={option} className="flex items-center gap-2">
                  <RadioGroupItem value={option} id={`${q.key}-${option}`} />
                  <label htmlFor={`${q.key}-${option}`} className="text-sm cursor-pointer">
                    {option}
                  </label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ))}

        <div className="space-y-2">
          <Label htmlFor="wizard-note">Ergaenzende Anmerkung</Label>
          <Textarea
            id="wizard-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional: Was die Antworten oben nicht abdecken — z.B. besondere Anforderungen, Stil-Wuensche oder Einschraenkungen."
            className="min-h-[60px]"
            maxLength={500}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setStep("describe")}>
            Zurueck
          </Button>
          <Button onClick={generate}>
            Generieren
            <ArrowRight className="ml-1.5 size-4" />
          </Button>
        </div>
      </div>
    )
  }

  // Step: Generating
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 max-w-2xl">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{typeLabel} wird generiert...</p>
    </div>
  )
}
