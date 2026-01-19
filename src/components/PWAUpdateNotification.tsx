import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Portal, Snackbar } from 'react-native-paper';
import { useTheme } from '@hooks/persisted';
import { getString } from '@strings/translations';

interface PWAUpdateNotificationProps {
  visible: boolean;
  onDismiss: () => void;
  onUpdate: () => void;
}

/**
 * Component to notify users that a PWA update is available
 * Shows a snackbar with update option
 */
const PWAUpdateNotification: React.FC<PWAUpdateNotificationProps> = ({
  visible,
  onDismiss,
  onUpdate,
}) => {
  const theme = useTheme();

  const handleUpdate = () => {
    onUpdate();
    // Give the user a moment to see the action
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  return (
    <Portal>
      <Snackbar
        visible={visible}
        onDismiss={onDismiss}
        action={{
          label: getString('browseScreen.update'),
          onPress: handleUpdate,
        }}
        duration={5000}
        style={[styles.snackbar, { backgroundColor: theme.primary }]}
      >
        <View>{getString('common.newUpdateAvailable')}</View>
      </Snackbar>
    </Portal>
  );
};

export default PWAUpdateNotification;

const styles = StyleSheet.create({
  snackbar: {
    marginBottom: 80,
  },
});
