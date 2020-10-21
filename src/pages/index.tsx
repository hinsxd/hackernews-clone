import { gql, useQuery } from '@apollo/client';
import { Card, CardContent, Container } from '@material-ui/core';
import { ItemsArgs, ItemsPayload, ItemsQueryVariables } from 'common/types';
import { NextPage } from 'next';
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
  flex: 0 0 300px;
  @media screen and (max-width: 960px) {
    flex: 0 0 auto;
  }
`;

const Index: NextPage = () => {
  const { data, error } = useQuery<
    { items: ItemsPayload },
    ItemsQueryVariables
  >(NEWSITEMS_QUERY, { variables: {} });

  return (
    <Wrapper>
      {data?.items.newsItems.map((item) => (
        <ItemCard key={item.id}>
          <CardContent>{item.title}</CardContent>
        </ItemCard>
      ))}
    </Wrapper>
  );
};

export default Index;
