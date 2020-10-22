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

## Part 1.1: HN Scraping (`scraper/index.ts`)

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

## Part 1.2: Serving data on GraphQL with Express (`server/index.ts`)

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

## 3.
