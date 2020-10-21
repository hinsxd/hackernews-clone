import { ItemsArgs, ItemsPayload, NewsItem } from 'common/types';
import cors from 'cors';
import express from 'express';
import { graphqlHTTP } from 'express-graphql';
import { buildSchema } from 'graphql';
import newsItems from '../data.json';
const schema = buildSchema(/* GraphQL */ `
  enum OrderBy {
    comments
    points
  }

  enum Order {
    desc
    asc
  }

  type NewsItem {
    id: Int!
    title: String!
    points: Int!
    author: String
    comments: Int!
    link: String
  }

  type NewsItemsPayload {
    count: Int!
    newsItems: [NewsItem!]!
  }

  type Query {
    items(
      orderBy: OrderBy = comments
      order: Order = desc
      limit: Int = 10
      offset: Int = 0
    ): NewsItemsPayload!
  }
`);

// Resolver

const root = {
  items: (args: ItemsArgs): ItemsPayload => {
    const { limit, offset, order, orderBy } = args;

    // If desc order, sort comparator is inverted.
    const modifier = order === 'desc' ? -1 : 1;
    const result = [...newsItems]
      .sort((a, b) => modifier * (a[orderBy] - b[orderBy]))
      .slice(offset, offset + limit);
    return {
      count: result.length,
      newsItems: result,
    };
  },
};

const app = express();
app.use(cors({ origin: '*' }));
app.use(
  '/graphql',
  graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true,
  })
);
app.listen(4000, () => {
  console.log('Running a GraphQL API server at http://localhost:4000/graphql');
});
