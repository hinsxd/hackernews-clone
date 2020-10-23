import { Ionicons } from '@expo/vector-icons';
import { AppLoading } from 'expo';
import * as Font from 'expo-font';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import {
  Body,
  Container,
  Header,
  Icon,
  Picker,
  Text,
  Title,
  View,
} from 'native-base';
import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Linking,
  StyleSheet,
  TouchableHighlight,
} from 'react-native';
import type { ItemsArgs, ItemsPayload, NewsItem } from '../common/types';
import data from './data.json';

const INITIAL_PAGESIZE = 20;
const FETCHMORE_PAGESIZE = 10;
// A function mocking fetching data from server
// Copying from resolver for simplicity
const getItems = (args: ItemsArgs): Promise<ItemsPayload> => {
  return new Promise((resolve) => {
    const { limit, offset, order, orderBy } = args;

    // If desc order, sort comparator is inverted.
    const modifier = order === 'desc' ? -1 : 1;
    const result = [...data]
      .sort((a, b) => modifier * (a[orderBy] - b[orderBy]))
      .slice(offset, offset + limit);
    setTimeout(() => {
      resolve({
        count: data.length,
        newsItems: result,
      });
    }, 700);
  });
};

export default function App() {
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    Font.loadAsync({
      Roboto: require('native-base/Fonts/Roboto.ttf'),
      Roboto_medium: require('native-base/Fonts/Roboto_medium.ttf'),
      ...Ionicons.font,
    }).then(() => {
      setIsReady(true);
    });
  }, []);

  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NewsItem[]>([]);
  const hasMore = items.length < count;
  const contentRef = useRef<FlatList>(null);
  useEffect(() => {
    if (isReady) {
      getItems({
        limit: INITIAL_PAGESIZE,
        offset: 0,
        orderBy: 'comments',
        order: 'desc',
      }).then((result) => {
        setItems(result.newsItems);
        setCount(result.count);
        setLoading(false);
      });
    }
  }, [isReady]);

  type OrderBy = 'comments' | 'points';
  const [orderBy, setOrderBy] = useState<OrderBy>('comments');
  type Order = 'desc' | 'desc';
  const [order, setOrder] = useState<Order>('desc');

  useEffect(() => {
    contentRef.current?.scrollToOffset({ offset: 0 });
    setLoading(true);
    getItems({
      order,
      orderBy,
      limit: INITIAL_PAGESIZE,
      offset: 0,
    }).then((result) => {
      setItems(result.newsItems);
      setCount(result.count);
      setLoading(false);
    });
  }, [orderBy, order]);

  const handleOrderByChange = (value: OrderBy) => {
    setOrderBy(value);
  };
  const handleOrderChange = (value: Order) => {
    setOrder(value);
  };

  const loadMore = () => {
    if (hasMore) {
      getItems({
        offset: items.length,
        limit: FETCHMORE_PAGESIZE,
        order,
        orderBy,
      }).then((fetchMoreResult) => {
        setItems([...items, ...fetchMoreResult.newsItems]);
      });
    }
  };

  if (!isReady) {
    return <AppLoading />;
  }
  const bull = ` • `;
  return (
    <Container>
      <Header style={styles.header}>
        <Body>
          <Title>HackerNews</Title>
        </Body>
      </Header>

      <View style={styles.toolbar}>
        <Text style={styles.optionLabel}>Sort By</Text>
        <Picker
          mode="dialog"
          iosHeader="Sort By"
          selectedValue={orderBy}
          textStyle={{ color: '#ffe0cc', fontWeight: '600', paddingRight: 0 }}
          iosIcon={
            <Icon
              name="arrow-dropdown-circle"
              style={{ color: '#ff6600', fontSize: 20 }}
            />
          }
          onValueChange={handleOrderByChange}
        >
          <Picker.Item label="Comments" value="comments" />
          <Picker.Item label="Points" value="points" />
        </Picker>
        <Picker
          mode="dialog"
          iosHeader="Order"
          selectedValue={order}
          textStyle={{ color: '#ffe0cc', fontWeight: '600', paddingRight: 0 }}
          iosIcon={
            <Icon
              name="arrow-dropdown-circle"
              style={{ color: '#ff6600', fontSize: 20 }}
            />
          }
          onValueChange={handleOrderChange}
        >
          <Picker.Item label="Descending" value="desc" />
          <Picker.Item label="Ascending" value="asc" />
        </Picker>
      </View>

      <FlatList
        ref={contentRef}
        data={items}
        keyExtractor={(item) => `${item.id}`}
        onEndReached={loadMore}
        ListHeaderComponent={
          loading && (
            <View style={styles.loadingIndicator}>
              <Text>Loading</Text>
            </View>
          )
        }
        ListFooterComponent={
          hasMore && (
            <View style={styles.fetchMoreBar}>
              <Text style={styles.fetchMoreText}>Loading more</Text>
            </View>
          )
        }
        renderItem={({ item, index, separators }) => (
          <TouchableHighlight
            style={styles.item}
            onPress={() => {
              Linking.openURL(item.link);
            }}
            underlayColor="#e6e6e6"
            onShowUnderlay={separators.highlight}
            onHideUnderlay={separators.unhighlight}
          >
            <View>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemLink}>{item.link}</Text>
              <Text style={styles.itemMeta}>
                {item.author}
                {bull}
                {item.relativeTime}
                {bull}
                <Icon
                  type="MaterialIcons"
                  name="thumb-up"
                  style={{ fontSize: 12 }}
                />{' '}
                {item.points}
                {bull}
                <Icon
                  type="MaterialIcons"
                  name="comment"
                  style={{ fontSize: 12 }}
                />{' '}
                {item.comments}
              </Text>
            </View>
          </TouchableHighlight>
        )}
      />
      <ExpoStatusBar />
    </Container>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#ff6600',
  },

  toolbar: {
    height: 50,
    paddingLeft: 24,
    paddingRight: 24,
    backgroundColor: '#666666',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionLabel: {
    color: '#ffffff',
  },
  loadingIndicator: {
    height: 50,
    paddingLeft: 24,
    paddingRight: 24,
    backgroundColor: '#ffd0b1',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  container: {
    // backgroundColor: '#ffffff',
  },
  content: {
    padding: 8,
  },
  item: {
    padding: 16,
    borderBottomColor: '#bbbbbb',
    borderBottomWidth: 1,
  },
  itemTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  itemLink: {
    marginBottom: 8,
    fontSize: 14,
    color: 'rgb(255, 102, 0)',
  },
  itemMeta: {
    fontSize: 14,
    color: '#666',
  },
  fetchMoreBar: {
    padding: 16,
    alignItems: 'center',
  },
  fetchMoreText: {
    color: '#666666',
  },
});
