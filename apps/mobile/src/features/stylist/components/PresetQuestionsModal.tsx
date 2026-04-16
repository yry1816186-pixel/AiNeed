import React from "react";
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from "react-native";
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import type { PresetQuestion } from '../stores/aiStylistStore';

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

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalContent: {
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    maxHeight: "70%",
  },
  title: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "600",
    color: DesignTokens.colors.neutral[900],
    marginBottom: 16,
    textAlign: "center",
  },
  questionsList: {
    gap: 10,
  },
  questionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: DesignTokens.colors.neutral[50],
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
  },
  questionIcon: {
    fontSize: DesignTokens.typography.sizes.xl,
    marginRight: 14,
  },
  questionText: {
    fontSize: DesignTokens.typography.sizes.md,
    color: DesignTokens.colors.neutral[800],
    fontWeight: "500",
    flex: 1,
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 12,
  },
  skipButtonText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: DesignTokens.colors.neutral[400],
  },
});
