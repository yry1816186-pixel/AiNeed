import React from "react";
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from "react-native";
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import type { PresetQuestion } from '../stores/aiStylistStore';
import { Spacing } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';


interface PresetQuestionsModalProps {
  visible: boolean;
  questions: PresetQuestion[];
  onSelect: (question: PresetQuestion) => void;
  onClose: () => void;
}

export const PresetQuestionsModal: React.FC<PresetQuestionsModalProps> = ({
  visible,
  questions,
  onSelect,
  onClose,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>What would you like to know?</Text>

          <ScrollView contentContainerStyle={styles.questionsList}>
            {questions.map((question) => (
              <Pressable
                key={question.id}
                style={styles.questionButton}
                onPress={() => onSelect(question)}
              >
                <Text style={styles.questionIcon}>{question.icon}</Text>
                <Text style={styles.questionText}>{question.text}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable style={styles.skipButton} onPress={onClose}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const useStyles = createStyles((colors) => ({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: DesignTokens.spacing[5],
    paddingBottom: Spacing.xl,
    maxHeight: "70%",
  },
  title: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "600",
    color: DesignTokens.colors.neutral[900],
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  questionsList: {
    gap: DesignTokens.spacing['2.5'],
  },
  questionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: 14,
    backgroundColor: DesignTokens.colors.neutral[50],
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
  },
  questionIcon: {
    fontSize: DesignTokens.typography.sizes.xl,
    marginRight: DesignTokens.spacing['3.5'],
  },
  questionText: {
    fontSize: DesignTokens.typography.sizes.md,
    color: DesignTokens.colors.neutral[800],
    fontWeight: "500",
    flex: 1,
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: DesignTokens.spacing['3.5'],
    marginTop: DesignTokens.spacing[3],
  },
  skipButtonText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: DesignTokens.colors.neutral[400],
  },
}))
