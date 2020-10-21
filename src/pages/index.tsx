import { gql, useQuery } from '@apollo/client';
import { Card, CardContent } from '@material-ui/core';
import { ItemsPayload, ItemsQueryVariables } from 'common/types';
import { NextPage } from 'next';
import { useRef } from 'react';
import { Waypoint } from 'react-waypoint';
import styled from 'styled-components';

const NEWSITEMS_QUERY = gql`
  query Items($limit: Int, $offset: Int, $orderBy: OrderBy, $order: Order) {
    items(limit: $limit, offset: $offset, orderBy: $orderBy, order: $order) {
      count
      newsItems {
        id
        title
        points
        author
        comments
        link
      }
    }
  }
`;

const Wrapper = styled.div`
  width: 100%;
  padding-left: 24px;
  padding-right: 24px;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  @media screen and (max-width: 960px) {
    flex-direction: column;
    align-items: stretch;
  }
`;
const ItemCard = styled(Card)`
  margin: 20px;
  flex: 0 0 400px;
  @media screen and (max-width: 960px) {
    flex: 0 0 auto;
  }
`;

const Index: NextPage = () => {
  const offset = useRef(0);
  const { data, error, fetchMore } = useQuery<
    { items: ItemsPayload },
    ItemsQueryVariables
  >(NEWSITEMS_QUERY, { variables: { limit: 40, offset: 0 }, ssr: true });

  const loadMore = async () => {
    offset.current += 40;

    await fetchMore({
      variables: { offset: offset.current },
      updateQuery: (prev, { fetchMoreResult }) => {
        // console.log(fetchMoreResult);
        console.log(prev);
        if (!fetchMoreResult) return prev;
        return {
          items: {
            ...prev.items,
            count: fetchMoreResult.items.count,
            newsItems: [
              ...prev.items.newsItems,
              ...fetchMoreResult.items.newsItems,
            ],
          },
        };
      },
    });
  };

  return (
    <Wrapper>
      {data?.items.newsItems.map((item) => (
        <ItemCard key={item.id}>
          <CardContent>{item.title}</CardContent>
        </ItemCard>
      ))}
      {data?.items.newsItems.length < data?.items.count && (
        <Waypoint onEnter={loadMore} />
      )}
    </Wrapper>
  );
};

export default Index;
