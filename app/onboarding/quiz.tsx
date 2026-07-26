import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DEPTH_MAX, DEPTH_MIN } from '@core/types/enums';
import { isAnswered, visibleQuestions } from '@core/quiz/questions';
import type { Question, QuizAnswer } from '@core/quiz/questions';
import { useAiProvider } from '@/store/useAiProvider';
import { useAppStore } from '@/store/useAppStore';
import { AppText, Button, Chip } from '@/ui/components';
import { useTheme, withAlpha } from '@/ui/theme';

/** Skin-tone swatches for the depth picker, lightest to deepest. */
const DEPTH_SWATCHES = [
  '#F7DFD0',
  '#F0CDB4',
  '#E5B594',
  '#D69C77',
  '#C08157',
  '#A66840',
  '#8A5130',
  '#6C3D24',
  '#4E2B19',
  '#331C10',
];

export default function Quiz() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const ai = useAiProvider();

  const profile = useAppStore((state) => state.profile);
  const updateProfile = useAppStore((state) => state.updateProfile);
  const completeQuiz = useAppStore((state) => state.completeQuiz);

  const [index, setIndex] = useState(0);
  const [notes, setNotes] = useState(profile.notes ?? '');
  const [finishing, setFinishing] = useState(false);

  // Recomputed from the profile so answering "what are you shopping for?"
  // immediately adds or removes the category-specific questions.
  const questions = useMemo(() => visibleQuestions(profile).slice(1), [profile]);
  const question = questions[Math.min(index, questions.length - 1)];
  const progress = questions.length > 0 ? (index + 1) / questions.length : 0;

  if (!question) {
    return null;
  }

  const answer = question.read(profile);
  const canAdvance = isAnswered(question, profile);
  const isLast = index === questions.length - 1;

  const setAnswer = (value: QuizAnswer) => {
    void updateProfile(question.write(profile, value));
  };

  const goBack = () => {
    if (index === 0) router.back();
    else setIndex((current) => current - 1);
  };

  const goNext = async () => {
    if (!isLast) {
      setIndex((current) => current + 1);
      return;
    }

    setFinishing(true);
    try {
      // The free-text answer is only useful if an AI provider can read it.
      // With AI off we still store it, so it can be applied later.
      if (notes.trim()) {
        await updateProfile({ notes: notes.trim() });
        if (ai.available) {
          const patch = await ai.parseIntent(notes.trim(), profile).catch(() => ({}));
          if (Object.keys(patch).length > 0) await updateProfile(patch);
        }
      }
      await completeQuiz();
      router.replace('/(tabs)');
    } finally {
      setFinishing(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={goBack}
          hitSlop={12}>
          <AppText variant="bodyStrong" color={theme.colors.primary}>
            Back
          </AppText>
        </Pressable>
        <AppText variant="caption" muted>
          {index + 1} of {questions.length}
        </AppText>
      </View>

      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: questions.length, now: index + 1 }}
        style={[styles.track, { backgroundColor: theme.colors.surfaceAlt }]}>
        <View
          style={[
            styles.fill,
            { backgroundColor: theme.colors.primary, width: `${progress * 100}%` },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled">
        <AppText variant="title" accessibilityRole="header">
          {question.title}
        </AppText>
        {question.subtitle ? (
          <AppText variant="caption" muted style={styles.subtitle}>
            {question.subtitle}
          </AppText>
        ) : null}

        <View style={styles.answers}>
          <AnswerControl
            question={question}
            answer={answer}
            notes={notes}
            onNotesChange={setNotes}
            onAnswer={setAnswer}
          />
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 16,
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
          },
        ]}>
        <Button
          label={isLast ? 'See my matches' : 'Continue'}
          icon={isLast ? 'sparkles' : 'arrow-forward'}
          fullWidth
          loading={finishing}
          disabled={!canAdvance}
          onPress={() => void goNext()}
        />
      </View>
    </View>
  );
}

function AnswerControl({
  question,
  answer,
  notes,
  onNotesChange,
  onAnswer,
}: {
  question: Question;
  answer: string[] | number | string | undefined;
  notes: string;
  onNotesChange: (value: string) => void;
  onAnswer: (value: QuizAnswer) => void;
}) {
  const theme = useTheme();

  switch (question.kind) {
    case 'single':
      return (
        <>
          {question.options?.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              hint={option.hint}
              selected={answer === option.value}
              onPress={() => onAnswer(option.value)}
            />
          ))}
        </>
      );

    case 'multi': {
      const selected = Array.isArray(answer) ? answer : [];
      return (
        <>
          {question.options?.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              hint={option.hint}
              selected={selected.includes(option.value)}
              onPress={() =>
                onAnswer(
                  selected.includes(option.value)
                    ? selected.filter((value) => value !== option.value)
                    : [...selected, option.value]
                )
              }
            />
          ))}
        </>
      );
    }

    case 'scale': {
      const scale = question.scale!;
      const current = typeof answer === 'number' ? answer : undefined;
      const steps = Array.from(
        { length: scale.max - scale.min + 1 },
        (_, offset) => scale.min + offset
      );
      return (
        <View>
          <View style={styles.scaleRow}>
            {steps.map((step) => {
              const active = current === step;
              return (
                <Pressable
                  key={step}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${step} out of ${scale.max}`}
                  onPress={() => onAnswer(step)}
                  style={[
                    styles.scaleDot,
                    {
                      backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                    },
                  ]}>
                  <AppText
                    variant="bodyStrong"
                    color={active ? theme.colors.primaryText : theme.colors.textMuted}>
                    {step}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.scaleLabels}>
            <AppText variant="caption" muted>
              {scale.minLabel}
            </AppText>
            <AppText variant="caption" muted>
              {scale.maxLabel}
            </AppText>
          </View>
        </View>
      );
    }

    case 'depth': {
      const current = typeof answer === 'number' ? answer : undefined;
      return (
        <View style={styles.depthGrid}>
          {DEPTH_SWATCHES.map((color, offset) => {
            const value = DEPTH_MIN + offset;
            const active = current === value;
            return (
              <Pressable
                key={color}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Depth ${value} of ${DEPTH_MAX}`}
                onPress={() => onAnswer(value)}
                style={[
                  styles.swatch,
                  {
                    backgroundColor: color,
                    borderColor: active ? theme.colors.primary : 'transparent',
                    shadowColor: withAlpha(theme.colors.primary, 0.5),
                  },
                ]}
              />
            );
          })}
        </View>
      );
    }

    case 'text':
      return (
        <TextInput
          accessibilityLabel={question.title}
          multiline
          value={notes}
          onChangeText={onNotesChange}
          placeholder={question.placeholder}
          placeholderTextColor={theme.colors.textMuted}
          style={[
            styles.textArea,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            },
          ]}
        />
      );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  track: { height: 3, marginHorizontal: 20, borderRadius: 999, overflow: 'hidden' },
  fill: { height: 3, borderRadius: 999 },
  body: { padding: 20, paddingTop: 28 },
  subtitle: { marginTop: 6, lineHeight: 19 },
  answers: { marginTop: 22 },
  scaleRow: { flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  scaleDot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  depthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: {
    width: 58,
    height: 58,
    borderRadius: 16,
    borderWidth: 3,
  },
  textArea: {
    minHeight: 130,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
