import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ProgressBar } from 'react-native-paper';

import {
  Appbar,
  EmptyView,
  SafeAreaView,
  SearchbarV2,
  SelectableChip,
} from '@components/index';
import GlobalSearchResultsList from './components/GlobalSearchResultsList';

import { useSearch } from '@hooks';
import { useTheme } from '@hooks/persisted';

import { getString } from '@strings/translations';
import { useGlobalSearch } from './hooks/useGlobalSearch';
import { useNavigation } from '@react-navigation/native';

interface Props {
  route?: {
    params?: {
      searchText?: string;
    };
  };
}

const GlobalSearchScreen = (props: Props) => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { searchText, setSearchText, clearSearchbar } = useSearch(
    props?.route?.params?.searchText,
    false,
  );
  const onChangeText = (text: string) => setSearchText(text);

  const [hasResultsOnly, setHasResultsOnly] = useState(false);

  const { searchResults, progress } = useGlobalSearch({
    defaultSearchText: searchText,
    hasResultsOnly,
  });

  return (
    <SafeAreaView style={styles.container}>
      <Appbar
        title={getString('browseScreen.globalSearch')}
        handleGoBack={navigation.goBack}
        theme={theme}
      />
      <View>
        <SearchbarV2
          searchText={searchText}
          placeholder={getString('browseScreen.globalSearch')}
          leftIcon="magnify"
          onChangeText={onChangeText}
          clearSearchbar={clearSearchbar}
          theme={theme}
        />
        {progress ? (
          <ProgressBar
            color={theme.primary}
            progress={Math.round(1000 * progress) / 1000}
          />
        ) : null}
        {progress > 0 ? (
          <View style={styles.filterContainer}>
            <SelectableChip
              label="Has results"
              selected={hasResultsOnly}
              icon="filter-variant"
              showCheckIcon={false}
              theme={theme}
              onPress={() => setHasResultsOnly(!hasResultsOnly)}
              mode="outlined"
            />
          </View>
        ) : null}
      </View>
      <GlobalSearchResultsList
        searchResults={searchResults}
        ListEmptyComponent={
          <EmptyView
            icon="__φ(．．)"
            description={`${getString('globalSearch.searchIn')} ${getString(
              'globalSearch.allSources',
            )}`}
            theme={theme}
          />
        }
      />
    </SafeAreaView>
  );
};

export default GlobalSearchScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    paddingHorizontal: 8,
    paddingTop: 16,
    flexDirection: 'row',
  },
});
