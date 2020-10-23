// @refresh reset
import { gql, useQuery } from '@apollo/client';
import {
  Card,
  CardActionArea,
  CardContent,
  Container,
  Grid,
  TextField,
} from '@material-ui/core';
import {
  Comment as CommentIcon,
  ThumbUp as ThumbUpIcon,
} from '@material-ui/icons';
import { ItemsPayload, ItemsQueryVariables } from 'common/types';
import { NextPage } from 'next';
import { ChangeEvent, useEffect, useState } from 'react';
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
        time
        relativeTime
      }
    }
  }
`;

// All 'styled' components can be found on bottom of file, to avoid distractions.

const INITIAL_PAGESIZE = 50;
const FETCHMORE_PAGESIZE = 10;

const Index: NextPage = () => {
  // Apollo query hook
  const { data, fetchMore, refetch } = useQuery<
    { items: ItemsPayload },
    ItemsQueryVariables
  >(NEWSITEMS_QUERY, {
    variables: {
      limit: INITIAL_PAGESIZE,
      offset: 0,
      orderBy: 'comments', // defaults should match initial states
      order: 'desc', // defaults should match initial states
    },
  });

  // Sorting Params
  // Defining types for use in functions
  type OrderBy = 'comments' | 'points';
  const [orderBy, setOrderBy] = useState<OrderBy>('comments');
  type Order = 'desc' | 'desc';
  const [order, setOrder] = useState<Order>('desc');

  // Change event handlers
  const handleOrderByChange = (e: ChangeEvent<HTMLInputElement>) => {
    setOrderBy(e.target.value as OrderBy);
  };
  const handleOrderChange = (e: ChangeEvent<HTMLInputElement>) => {
    setOrder(e.target.value as Order);
  };

  // Infinite loading
  // Auto fetch when scrolling to bottom.
  const loadMore = async () => {
    await fetchMore({
      variables: {
        offset: data?.items?.newsItems.length || 0,
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
            newsItems: [
              ...prev.items.newsItems,
              ...fetchMoreResult.items.newsItems,
            ],
          },
        };
      },
    });
  };

  // When searching param changes, refetch items.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    refetch({ order, orderBy });
  }, [orderBy, order, refetch]);
  return (
    <div>
      {/* An orange bar mimicking HN */}
      <Topbar>
        <Logo />
        <PageTitle>Hacker News</PageTitle>
      </Topbar>

      {/* A stick toolbar to set sorting params easily */}
      <Toolbar>
        <OptionLabel>Sort by</OptionLabel>
        <StyledTextField
          select
          variant="outlined"
          size="small"
          SelectProps={{ native: true }}
          value={orderBy}
          onChange={handleOrderByChange}
        >
          <option value="comments">Comments</option>
          <option value="points">Points</option>
        </StyledTextField>
        <OptionLabel>Order</OptionLabel>
        <StyledTextField
          variant="outlined"
          size="small"
          select
          SelectProps={{ native: true }}
          value={order}
          onChange={handleOrderChange}
        >
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </StyledTextField>
      </Toolbar>

      {/* Fetched Items */}
      <Container maxWidth={false}>
        <Grid container spacing={2}>
          {data?.items.newsItems.map((item) => (
            <Grid key={item.id} item xl={3} lg={4} md={6} xs={12}>
              <Card>
                <CardActionArea
                  onClick={() =>
                    // Does not use href because it turns the button into <a>,
                    // where we have another <a> element inside the card.
                    window.open(item.link, '_blank', 'noreferrer noopener')
                  }
                >
                  <CardContent>
                    <TitleText>{item.title}</TitleText>
                    <LinkText
                      href={item.link}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      {item.link}
                    </LinkText>
                    <MetaRow>
                      {item.author && (
                        <>
                          {item.author}
                          <Bullet>•</Bullet>
                        </>
                      )}

                      {item.relativeTime && (
                        <>
                          {item.relativeTime}
                          <Bullet>•</Bullet>
                        </>
                      )}

                      <ThumbUpIcon fontSize="inherit" />
                      {item.points}
                      <Bullet>•</Bullet>
                      <CommentIcon fontSize="inherit" />
                      {item.comments}
                    </MetaRow>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* 
          If loaded items is less than total count,
          render a hidden element. 
          Fetch more when scroll to bottom 
        */}
        {data?.items.newsItems.length < data?.items.count && (
          <Waypoint onEnter={loadMore} />
        )}
      </Container>
    </div>
  );
};

export default Index;

const Logo = styled.div`
  height: 30px;
  width: 30px;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: 900;
  font-size: 18px;
  ::before {
    content: 'Y';
  }
  border: 3px solid white;
`;

const PageTitle = styled.span`
  font-weight: 900;
  font-size: 24px;
  color: white;
`;

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
  z-index: 10;
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
  & > :last-child {
    margin-right: 0;
  }
`;

const OptionLabel = styled.span`
  font-size: 14px;
  color: #dddddd;
`;

const StyledTextField = styled(TextField)`
  & * {
    font-weight: 600;
    color: #eeeeee;
  }
  & .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline {
    border-color: #eeeeee;
  }
  & .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline {
    border-color: #999999;
  }
`;

const TitleText = styled.span`
  font-size: 16px;
  font-weight: 600;
  display: -webkit-box;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 2;
  max-width: 100%;
  -webkit-box-orient: vertical;
`;

const LinkText = styled.a`
  text-decoration: none;
  color: rgb(255, 102, 0);
  &:hover {
    color: rgb(255, 0, 0);
  }
  &:visited {
    color: rgba(255, 0, 98, 0.486);
  }
  display: block;
  margin-top: 5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const MetaRow = styled.span`
  margin-top: 5px;
  display: block;
  color: #666666;
  display: flex;
  align-items: center;
`;

const Bullet = styled.span`
  display: inline-block;
  margin: 0 4px;
`;
