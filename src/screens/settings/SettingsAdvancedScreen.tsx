import React, { useState, useMemo } from 'react';

import { Portal, Text, TextInput } from 'react-native-paper';

import { useTheme, useUserAgent, useProxySettings } from '@hooks/persisted';
import { showToast } from '@utils/showToast';

import { deleteCachedNovels } from '@hooks/persisted/useNovel';
import { getString } from '@strings/translations';
import { useBoolean } from '@hooks';
import ConfirmationDialog from '@components/ConfirmationDialog/ConfirmationDialog';
import {
  deleteReadChaptersFromDb,
  clearUpdates,
} from '@database/queries/ChapterQueries';
import { runDatabaseMaintenance } from '@database/queries/MaintenanceQueries';

import { Appbar, Button, List, Modal, SafeAreaView } from '@components';
import { AdvancedSettingsScreenProps } from '@navigators/types';
import { ScrollView, StyleSheet, View, Platform, Switch } from 'react-native';
import { getUserAgentSync } from 'react-native-device-info';
import CookieManager from '@react-native-cookies/cookies';
import { store } from '@plugins/helpers/storage';
import { recreateDatabaseIndexes } from '@database/db';
import { getErrorMessage } from '@utils/error';

// Extract Switch component to avoid creating during render
const ProxySwitchControl = ({
  value,
  onValueChange,
  color,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  color: string;
}) => (
  <View style={styles.switchContainer}>
    <Switch value={value} onValueChange={onValueChange} color={color} />
  </View>
);

const AdvancedSettings = ({ navigation }: AdvancedSettingsScreenProps) => {
  const theme = useTheme();
  const clearCookies = () => {
    CookieManager.clearAll();
    store.clearAll();
    showToast(getString('webview.cookiesCleared'));
  };

  const { userAgent, setUserAgent } = useUserAgent();
  const [userAgentInput, setUserAgentInput] = useState(userAgent);

  // Proxy settings
  const {
    proxyUrl,
    proxyEnabled,
    cloudflareBypassEnabled,
    setProxyUrl,
    setProxyEnabled,
    setCloudflareBypassEnabled,
  } = useProxySettings();
  const [proxyUrlInput, setProxyUrlInput] = useState(proxyUrl);
  const [testingProxy, setTestingProxy] = useState(false);
  const [proxyTestResult, setProxyTestResult] = useState<string | null>(null);

  /**
   * Confirm Clear Database Dialog
   */
  const [clearDatabaseDialog, setClearDatabaseDialog] = useState(false);
  const showClearDatabaseDialog = () => setClearDatabaseDialog(true);
  const hideClearDatabaseDialog = () => setClearDatabaseDialog(false);

  const [clearUpdatesDialog, setClearUpdatesDialog] = useState(false);
  const showClearUpdatesDialog = () => setClearUpdatesDialog(true);
  const hideClearUpdatesDialog = () => setClearUpdatesDialog(false);

  const {
    value: deleteReadChaptersDialog,
    setTrue: showDeleteReadChaptersDialog,
    setFalse: hideDeleteReadChaptersDialog,
  } = useBoolean();

  const {
    value: userAgentModalVisible,
    setTrue: showUserAgentModal,
    setFalse: hideUserAgentModal,
  } = useBoolean();

  const {
    value: proxyModalVisible,
    setTrue: showProxyModal,
    setFalse: hideProxyModal,
  } = useBoolean();

  const {
    value: recreateDatabaseIndexesDialog,
    setTrue: showRecreateDBIndexDialog,
    setFalse: hideRecreateDBIndexDialog,
  } = useBoolean();

  const {
    value: maintenanceDialog,
    setTrue: showMaintenanceDialog,
    setFalse: hideMaintenanceDialog,
  } = useBoolean();

  const [isRunningMaintenance, setIsRunningMaintenance] = useState(false);

  const handleDatabaseMaintenance = async () => {
    setIsRunningMaintenance(true);
    hideMaintenanceDialog();
    try {
      const results = await runDatabaseMaintenance();
      const totalCleaned =
        results.orphanedChapters +
        results.orphanedNovelCategories +
        results.orphanedMMKVEntries +
        results.orphanedFiles;

      if (totalCleaned > 0) {
        showToast(
          getString('advancedSettingsScreen.maintenanceComplete', {
            count: totalCleaned,
          }),
        );
      } else {
        showToast(
          getString('advancedSettingsScreen.maintenanceNothingToClean'),
        );
      }
    } catch (error) {
      showToast(
        getString('advancedSettingsScreen.maintenanceFailed') +
          ': ' +
          getErrorMessage(error),
      );
    } finally {
      setIsRunningMaintenance(false);
    }
  };

  const handleTestProxy = async () => {
    if (!proxyUrlInput || !proxyUrlInput.trim()) {
      setProxyTestResult('Please enter a proxy URL first');
      return;
    }

    setTestingProxy(true);
    setProxyTestResult(null);

    try {
      const testUrl = 'https://httpbin.org/get';
      const separator = proxyUrlInput.includes('?') ? '&' : '?';
      const proxyTestUrl = `${proxyUrlInput}${separator}url=${encodeURIComponent(
        testUrl,
      )}`;

      const response = await fetch(proxyTestUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        setProxyTestResult('✓ Proxy is working correctly');
      } else {
        setProxyTestResult(`✗ Proxy returned status ${response.status}`);
      }
    } catch (error) {
      setProxyTestResult(
        `✗ Failed to connect: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    } finally {
      setTestingProxy(false);
    }
  };

  // Memoize render functions to avoid unstable component warnings
  const proxyEnabledRightRenderer = useMemo(
    () => () =>
      (
        <ProxySwitchControl
          value={proxyEnabled}
          onValueChange={setProxyEnabled}
          color={theme.primary}
        />
      ),
    [proxyEnabled, setProxyEnabled, theme.primary],
  );

  const cloudflareBypassRightRenderer = useMemo(
    () => () =>
      (
        <ProxySwitchControl
          value={cloudflareBypassEnabled}
          onValueChange={setCloudflareBypassEnabled}
          color={theme.primary}
        />
      ),
    [cloudflareBypassEnabled, setCloudflareBypassEnabled, theme.primary],
  );

  return (
    <SafeAreaView excludeTop>
      <Appbar
        title={getString('advancedSettings')}
        handleGoBack={() => navigation.goBack()}
        theme={theme}
      />
      <ScrollView>
        <List.Section>
          <List.SubHeader theme={theme}>
            {getString('advancedSettingsScreen.dataManagement')}
          </List.SubHeader>
          <List.Item
            title={getString('advancedSettingsScreen.clearCachedNovels')}
            description={getString(
              'advancedSettingsScreen.clearCachedNovelsDesc',
            )}
            onPress={showClearDatabaseDialog}
            theme={theme}
          />
          <List.Item
            title={getString('advancedSettingsScreen.recreateDBIndexes')}
            description={getString(
              'advancedSettingsScreen.recreateDBIndexesDesc',
            )}
            onPress={showRecreateDBIndexDialog}
            theme={theme}
          />
          <List.Item
            title={getString('advancedSettingsScreen.databaseMaintenance')}
            description={getString(
              'advancedSettingsScreen.databaseMaintenanceDesc',
            )}
            onPress={showMaintenanceDialog}
            disabled={isRunningMaintenance}
            theme={theme}
          />
          <List.Item
            title={getString('advancedSettingsScreen.clearUpdatesTab')}
            description={getString(
              'advancedSettingsScreen.clearupdatesTabDesc',
            )}
            onPress={showClearUpdatesDialog}
            theme={theme}
          />
          <List.Item
            title={getString('advancedSettingsScreen.deleteReadChapters')}
            onPress={showDeleteReadChaptersDialog}
            theme={theme}
          />
          <List.Item
            title={getString('webview.clearCookies')}
            onPress={clearCookies}
            theme={theme}
          />
          <List.Item
            title={getString('advancedSettingsScreen.userAgent')}
            description={userAgent}
            onPress={showUserAgentModal}
            theme={theme}
          />
        </List.Section>
        {Platform.OS === 'web' && (
          <List.Section>
            <List.SubHeader theme={theme}>
              External Proxy Configuration
            </List.SubHeader>
            <List.Item
              title="Enable Proxy"
              description={
                proxyEnabled ? 'Proxy is enabled' : 'Proxy is disabled'
              }
              onPress={() => setProxyEnabled(!proxyEnabled)}
              right={proxyEnabledRightRenderer}
              theme={theme}
            />
            <List.Item
              title="Configure Proxy URL"
              description={proxyUrl || 'No proxy configured'}
              onPress={showProxyModal}
              theme={theme}
            />
            <List.InfoItem
              title="Configure an external CORS proxy running on the same device (e.g., localhost:8080). The proxy should support forwarding cookies for Cloudflare bypass."
              icon="information-outline"
              theme={theme}
            />
          </List.Section>
        )}
        {Platform.OS === 'web' && proxyEnabled && (
          <List.Section>
            <List.SubHeader theme={theme}>Cloudflare Bypass</List.SubHeader>
            <List.Item
              title="Enable Cloudflare Bypass"
              description={
                cloudflareBypassEnabled
                  ? 'Cookies from WebView will be forwarded'
                  : 'Cloudflare bypass is disabled'
              }
              onPress={() =>
                setCloudflareBypassEnabled(!cloudflareBypassEnabled)
              }
              right={cloudflareBypassRightRenderer}
              theme={theme}
            />
            <List.InfoItem
              title="When enabled, cookies from WebView sessions (including Cloudflare clearance cookies) will be forwarded through the proxy. Open the source in WebView first to solve Cloudflare challenges, then use the app normally."
              icon="shield-check-outline"
              theme={theme}
            />
          </List.Section>
        )}
      </ScrollView>
      <Portal>
        <ConfirmationDialog
          message={getString(
            'advancedSettingsScreen.deleteReadChaptersDialogTitle',
          )}
          visible={deleteReadChaptersDialog}
          onSubmit={deleteReadChaptersFromDb}
          onDismiss={hideDeleteReadChaptersDialog}
          theme={theme}
        />
        <ConfirmationDialog
          message={getString(
            'advancedSettingsScreen.recreateDBIndexesDialogTitle',
          )}
          visible={recreateDatabaseIndexesDialog}
          onSubmit={() => {
            recreateDatabaseIndexes();
            showToast(
              getString('advancedSettingsScreen.recreateDBIndexesToast'),
            );
          }}
          onDismiss={hideRecreateDBIndexDialog}
          theme={theme}
        />
        <ConfirmationDialog
          message={getString('advancedSettingsScreen.clearDatabaseWarning')}
          visible={clearDatabaseDialog}
          onSubmit={deleteCachedNovels}
          onDismiss={hideClearDatabaseDialog}
          theme={theme}
        />
        <ConfirmationDialog
          message={getString(
            'advancedSettingsScreen.databaseMaintenanceDialogTitle',
          )}
          visible={maintenanceDialog}
          onSubmit={handleDatabaseMaintenance}
          onDismiss={hideMaintenanceDialog}
          theme={theme}
        />
        <ConfirmationDialog
          message={getString('advancedSettingsScreen.clearUpdatesWarning')}
          visible={clearUpdatesDialog}
          onSubmit={() => {
            clearUpdates();
            showToast(getString('advancedSettingsScreen.clearUpdatesMessage'));
            hideClearUpdatesDialog();
          }}
          onDismiss={hideClearUpdatesDialog}
          theme={theme}
        />

        <Modal visible={userAgentModalVisible} onDismiss={hideUserAgentModal}>
          <Text style={[styles.modalTitle, { color: theme.onSurface }]}>
            {getString('advancedSettingsScreen.userAgent')}
          </Text>
          <Text style={{ color: theme.onSurfaceVariant }}>{userAgent}</Text>
          <TextInput
            multiline
            mode="outlined"
            defaultValue={userAgent}
            onChangeText={text => setUserAgentInput(text.trim())}
            placeholderTextColor={theme.onSurfaceDisabled}
            underlineColor={theme.outline}
            style={[{ color: theme.onSurface }, styles.textInput]}
            theme={{ colors: { ...theme } }}
          />
          <View style={styles.buttonGroup}>
            <Button
              onPress={() => {
                setUserAgent(userAgentInput);
                hideUserAgentModal();
              }}
              style={styles.button}
              title={getString('common.save')}
              mode="contained"
            />
            <Button
              style={styles.button}
              onPress={() => {
                setUserAgent(getUserAgentSync());
                hideUserAgentModal();
              }}
              title={getString('common.reset')}
            />
          </View>
        </Modal>

        <Modal visible={proxyModalVisible} onDismiss={hideProxyModal}>
          <Text style={[styles.modalTitle, { color: theme.onSurface }]}>
            External Proxy URL Configuration
          </Text>
          <Text
            style={[styles.proxyDescription, { color: theme.onSurfaceVariant }]}
          >
            Enter the URL of your CORS proxy running on the same device (e.g.,
            localhost). The proxy should accept a 'url' query parameter and
            forward cookies for Cloudflare bypass.
          </Text>
          <Text
            style={[styles.proxyExample, { color: theme.onSurfaceVariant }]}
          >
            Example: http://localhost:8080?url=TARGET_URL
          </Text>
          <TextInput
            mode="outlined"
            defaultValue={proxyUrl}
            onChangeText={text => setProxyUrlInput(text.trim())}
            placeholder="http://localhost:8080"
            placeholderTextColor={theme.onSurfaceDisabled}
            underlineColor={theme.outline}
            style={[{ color: theme.onSurface }, styles.proxyInput]}
            theme={{ colors: { ...theme } }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          {proxyTestResult && (
            <Text
              style={[
                styles.proxyTestResult,
                {
                  color: proxyTestResult.startsWith('✓')
                    ? theme.primary
                    : theme.error,
                },
              ]}
            >
              {proxyTestResult}
            </Text>
          )}
          <View style={styles.buttonGroup}>
            <Button
              onPress={() => {
                setProxyUrl(proxyUrlInput);
                setProxyTestResult(null);
                hideProxyModal();
                showToast('Proxy URL saved');
              }}
              style={styles.button}
              title={getString('common.save')}
              mode="contained"
            />
            <Button
              style={styles.button}
              onPress={handleTestProxy}
              disabled={testingProxy}
              title={testingProxy ? 'Testing...' : 'Test Proxy'}
            />
            <Button
              style={styles.button}
              onPress={() => {
                setProxyUrl('');
                setProxyUrlInput('');
                setProxyTestResult(null);
                hideProxyModal();
                showToast('Proxy URL cleared');
              }}
              title="Clear"
            />
          </View>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
};

export default AdvancedSettings;

const styles = StyleSheet.create({
  button: {
    flex: 1,
    marginHorizontal: 8,
    marginTop: 16,
  },
  buttonGroup: {
    flexDirection: 'row-reverse',
  },
  modalTitle: {
    fontSize: 24,
    marginBottom: 16,
  },
  textInput: {
    borderRadius: 14,
    fontSize: 12,
    height: 120,
    marginBottom: 8,
    marginTop: 16,
  },
  proxyInput: {
    borderRadius: 14,
    fontSize: 14,
    marginBottom: 8,
    marginTop: 8,
  },
  proxyTestResult: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 8,
  },
  switchContainer: {
    justifyContent: 'center',
    paddingRight: 8,
  },
  proxyDescription: {
    marginBottom: 8,
  },
  proxyExample: {
    marginBottom: 16,
    fontSize: 12,
  },
});
