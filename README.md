# HackerNews Clone

Yet another HackerNews clone built _with Next.js, Express + GraphQL server_

## Project Structure

```bash
.
├── .babelrc                # Babel plugin used together with styled-components
├── .eslintrc.js            # Typescript Eslint rules
├── .gitignore
├── .prettierrc             # Prettier rules
├── README.md               # You're here ;)
├── common
│   └── types.ts            # 'NewsItem' type shared across server and web
├── data.json               # Generated data from scraping
├── next-env.d.ts
├── package.json
├── scraper
│   └── index.ts            # Part I: Scrape HN with Cheerio.
├── server
│   └── index.ts            # Part I: Serve the data with GraphQL and Node
├── src                     # Part II: Responsive Web with Material UI and styled-components
│   ├── apollo              # Apollo setup
│   │   └── index.ts        # Ref: https://github.com/vercel/next.js/blob/canary/examples/with-apollo/lib/apolloClient.js
│   ├── pages
│   │   ├── _app.tsx        # Misc Settings to make MUI works with Next.js
│   │   ├── _document.tsx   # Misc Settings to make MUI works with Next.js
│   │   └── index.tsx       # Main page displaying content
│   └── theme
│       └── index.ts        # MUI theme with responsive font sizes
├── tsconfig.json
└── yarn.lock
```

## Getting started

First, install the dependencies with `yarn` or `npm`

```bash
# For yarn users
$ yarn

# For npm users
$ npm i

```

### Scraping data

To scrape latest HackerNews, run the script `scrape`:

```bash
$ yarn scrape

# or

$ npm run scrape
```

The script will generate `data.json` at root level, in the format of

```json
[
  {
    "id": 24849452,
    "points": 965,
    "author": "sushicalculus",
    "title": "Facebook Container for Firefox",
    "link": "https://www.mozilla.org/en-US/firefox/facebookcontainer/",
    "comments": 327,
    "time": "2020-10-21T16:50:30.000Z",
    "relativeTime": "10 hours ago"
  },
  ...
]
```

### Graphql Server

To server the data over GraphQL, simply run:

```bash
$ yarn start:server

# or

$ npm run start:server
```

This runs `server/index.ts` with `ts-node-dev` in watching mode, which will respawn at file change.

As this does not mean to be deployed a server, no production tools have been set up.

At production, `pm2` / `nodemon` will be used to allow clustering, crash-respawn, etc.

### Next.JS frontend

To start the Next.js **dev server**, run

```bash
$ yarn dev

# or

$ npm run dev
```

The webpage will be updated at file change.

To build and serve the SSR/Static Next.js website, run

```bash
$ yarn build && yarn start

# or

$ npm run build && npm run start
```

## Part 1.1. HN Scraping (`scraper/index.ts`)

### Tools used:

- `axios`

  - Fetch html of a page from HN

    ```typescript
    // scraper/index.ts:7
    const URL = `https://news.ycombinator.com/news?p=`;

    async function loadPage(page = 1): Promise<string> {
      return axios.get(`${URL}${page}`).then((result) => result.data);
    }
    ```

- `cheerio`

  - Parse html to extract item details

    ```typescript
    // scraper/index.ts:30-68
    const html = await loadPage(page);
    const $ = cheerio.load(html);

    // Remove distracting spacer
    const spacer = $('body').find('table.itemlist tr.spacer');
    spacer.remove();

    const titleRows = $('table.itemlist tbody tr.athing');

    titleRows.toArray().forEach((el) => {
      const id = +el.attribs.id;

      // Skipping if already parsed this ID.
      if (ids.has(id)) return;
      ids.add(id);

      // Title and link
      const titleEl = $(`tr#${id}.athing > td.title`);
      const storylinkEl = titleEl.find('a.storylink');
      const title = storylinkEl.text();
      const link = storylinkEl.attr().href;

      // Point
      const pointEl = $(`#score_${id}`);
      const pointStr = pointEl.text(); // Sometimes there will be no points
      const points = pointStr === '' ? 0 : +pointStr.split(' ')[0]; // 'n points' -> n
      // author name
      const author = pointEl.siblings('a.hnuser').text() || null;

      // comments count
      const commentEl = pointEl.siblings(`a[href^="item?"]`);
      const commentStr = commentEl.text();
      // For some unknown reason, commentStr.split(' ') is not working.
      // Using regex instead
      const countMatch = /^(\d+).*comment/.exec(commentStr);
      const comments = countMatch ? parseInt(countMatch[0]) : 0;

      // Parse post date string with 'chrono-node'
      const timeStr = pointEl.siblings('.age').find('a').text();
      const time = parse(timeStr)[0]?.date().toISOString() || null;
    });
    ```

  - Look for `More` link on page to determine to terminate scraping or not

    ```typescript
    // Look for 'More' button
    if ($('.morelink').get().length > 0) {
      page++;
    } else {
      hasNext = false;
    }
    ```

- `chrono-node`
  - Parse relative time string, e.g. '6 hours ago' to a `Date` corresponding to the time of scraping.
    ```typescript
    // Parse post date string with 'chrono-node'
    const timeStr = pointEl.siblings('.age').find('a').text();
    const time = parse(timeStr)[0]?.date().toISOString() || null;
    ```

## Part 1.2. Serving data on GraphQL with Express (`server/index.ts`)

### Schema

```graphql
# server/index.ts:8-41

# Two enums to regulate input for sorting and ordering
enum OrderBy {
  comments
  points
}

enum Order {
  desc
  asc
}

# Main Entity Type
type NewsItem {
  id: Int!
  title: String!
  points: Int!
  author: String
  comments: Int!
  link: String
  time: String
  relativeTime: String
}

# Payload type to return total count and items,
# to facilitate infinite loading behavior.
type NewsItemsPayload {
  count: Int!
  newsItems: [NewsItem!]!
}

type Query {
  # Main query
  items(
    orderBy: OrderBy = comments
    order: Order = desc

    # pagination variables
    limit: Int = 10
    offset: Int = 0
  ): NewsItemsPayload!
}
```

### Resolver

```typescript
const root = {
  items: (args: ItemsArgs): ItemsPayload => {
    const { limit, offset, order, orderBy } = args;

    // If desc order, sort comparator is inverted.
    const modifier = order === 'desc' ? -1 : 1;

    // Copy the array so that sorting will not modifiy original array
    const result = [...newsItems]
      .sort((a, b) => modifier * (a[orderBy] - b[orderBy]))
      // Pagination
      .slice(offset, offset + limit);
    return {
      count: newsItems.length,
      newsItems: result,
    };
  },
};
```

### CORS issue

When querying `http://localhost:4000/graphql` from `http://localhost:3000`, `mode: 'no-cors'` seems reasonable as we do not have any authentication. But according to [https://stackoverflow.com/a/43319482](https://stackoverflow.com/a/43319482), this will lead to `SyntaxError: Unexpected end of input` while parsing the response.

As a result, `cors` is used to allow all origins.

```typescript
// server/index.ts:63
app.use(cors({ origin: '*' }));
```

## Part 2. Next.js Frontend With Apollo Client, Material UI

### GraphQL Query

```graphql
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
      time
      relativeTime
    }
  }
}
```

### Query variables

```typescript
// Variables in server will not be optional due to default variables in GQL Schema
export type ItemsArgs = {
  orderBy: 'points' | 'comments';
  order: 'desc' | 'asc';
  limit: number;
  offset: number;
};

// Variables are partial in frontend.
export type ItemsQueryVariables = Partial<ItemsArgs>;
```

### Sorting and ordering

Two state variables are used:

```typescript
// src/pages/index.tsx:63
type OrderBy = 'comments' | 'points';
const [orderBy, setOrderBy] = useState<OrderBy>('comments');

type Order = 'desc' | 'desc';
const [order, setOrder] = useState<Order>('desc');
```

When these two variables change, an effect will be triggered to `refetch` data.
This will also scroll back to top for convenience.

```typescript
// src/pages/index.tsx:105
// When searching param changes, refetch items.
useEffect(() => {
  window.scrollTo({ top: 0 });
  refetch({ order, orderBy });
}, [orderBy, order, refetch]);
```

### Infinite loading

The `count` property in the data response shows the total number of items available. When the current fetched item is less then `count`, a `Waypoint` from `react-waypoint` will be rendered at the end of the page.

```tsx
// src/pages/index.tsx:201
{
  data?.items.newsItems.length < data?.items.count && (
    <Waypoint onEnter={loadMore} />
  );
}
```

This will fire the following function when this invisible element is scrolled into the viewport.

```typescript
// src/pages/index.tsx:78
// Infinite loading
// Auto fetch when scrolling to bottom.
const loadMore = async () => {
  await fetchMore({
    variables: {
      // Offset is the current items size
      offset: data?.items?.newsItems.length || 0,
      // A predefined value, which is 10 in the requirement
      limit: FETCHMORE_PAGESIZE,
    },
    updateQuery: (prev, { fetchMoreResult }) => {
      // As result is not simple array (see src/types),
      // we need to merge the newsItems array
      if (!fetchMoreResult || fetchMoreResult.items.newsItems.length === 0) {
        return prev;
      }

      return {
        items: {
          ...prev.items,
          count: fetchMoreResult.items.count,
          // appending new items to old items
          newsItems: [
            ...prev.items.newsItems,
            ...fetchMoreResult.items.newsItems,
          ],
        },
      };
    },
  });
};
```

### Styling

`styled-components` is used as recommended. Custom styles are mainly used to build `Topbar` and `Toolbar`, which serve as mimicking HN and sorting controls respectively.

```typescript
// src/pages/index.tsx:229
const Topbar = styled.div`
  height: 50px;
  width: 100%;
  background-color: #ff6600;
  padding-left: 24px;
  padding-right: 24px;
  display: flex;
  align-items: center;
  & > * {
    margin-right: 10px;
  }
`;

const Toolbar = styled.div`
  height: 50px;
  width: 100%;
  padding-left: 24px;
  padding-right: 24px;
  margin-bottom: 24px;
  background-color: #666666;
  display: flex;
  align-items: center;
  position: sticky;
  top: 0px;
  & > * {
    margin-right: 10px;
  }
`;
// ...and more
```

### Responsiveness

Responsive display of new items is achieved by `<Grid>` from Material UI.

Each `<Card>` is wrapped in a `<Grid item>` responsive widths. The minimal requirement of choosing widths is to ensure the row showing item meta (points, comments, author) has enough widths.

```tsx
// src/pages/index.tsx:145
<Grid container spacing={2}>
  {data?.items.newsItems.map((item) => (
    <Grid key={item.id} item xl={3} lg={4} md={6} xs={12}>
      <Card></Card>
    </Grid>
  ))}
</Grid>
```

## Difficulties, Limitations and Possible Improvements

### Scraping data

- HN does not provide an API, and the position of items changes rapidly over time, leading to duplicate or missing items. The problem of uplicate items is handled in the code. But to avoid missing items, we need to fetch data as fast as possible with parallel request, but:
- HN limits to 4 parallel requests. Currently, pages are fetched one by one for convenience.
- Improvements:
  - Fetch 4 pages in parallel each time, and merging the fetched items arrays. Determine whether to fetch the next batch by checking if any results as less than 30 items, because each HN pages has 30 items at most.
- HN does not provide anything any data of real posted time of an item. We can only guess by parsing relative time strings like `6 hours ago` using `chrono-node`. This prevents accurate sorting by posted time of items.

### Frontend

- Currently only supports sorting by comments count and points. If the real posted time can be extracted from the webpage, sorting by time / time-range can also be possible.
