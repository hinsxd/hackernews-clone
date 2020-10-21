import { gql, useQuery } from '@apollo/client';
import { Card, CardContent } from '@material-ui/core';
import { ItemsArgs, ItemsPayload, ItemsQueryVariables } from 'common/types';
import { NextPage } from 'next';

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

const Index: NextPage = () => {
  const { data, error } = useQuery<
    { items: ItemsPayload },
    ItemsQueryVariables
  >(NEWSITEMS_QUERY, { variables: {} });

  return (
    <div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

export default Index;
