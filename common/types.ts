export type NewsItem = {
  id: number;
  title: string;
  points: number;
  author: string | null;
  comments: number;
  link: string | null;
  time: string;
  relativeTime: string;
};

export type ItemsArgs = {
  orderBy: 'points' | 'comments';
  order: 'desc' | 'asc';
  limit: number;
  offset: number;
};

// Variables are partial because GraphQL server has default variables.
export type ItemsQueryVariables = Partial<ItemsArgs>;

export type ItemsPayload = {
  count: number;
  newsItems: NewsItem[];
};
