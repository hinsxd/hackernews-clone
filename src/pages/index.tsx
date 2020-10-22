// @refresh reset
import { gql, useQuery } from '@apollo/client';
import {
  Avatar,
  Card,
  CardContent,
  CardHeader,
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
      <Titlebar>
        <Logo />
        <PageTitle>Hacker News</PageTitle>
      </Titlebar>

      {/* A stick toolbar to set sorting params easily */}
      <Toolbar>
        <OptionLabel>Sort by</OptionLabel>
        <StyledTextField
          select
          variant="outlined"
          size="small"
          SelectProps={{ native: true }}
          style={{ color: 'white' }}
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
      <ItemsWrapper>
        {data?.items.newsItems.map((item) => (
          <ItemCard key={item.id}>
            <CardHeader
              avatar={
                <Avatar>{item.author?.[0].toLocaleUpperCase() || ''}</Avatar>
              }
              title={item.author}
              subheader={
                <SubheaderRow>
                  {item.relativeTime}
                  <Bullet>•</Bullet>
                  <ThumbUpIcon fontSize="inherit" />
                  {item.points}
                  <Bullet>•</Bullet>
                  <CommentIcon fontSize="inherit" />
                  {item.comments}
                </SubheaderRow>
              }
            />
            <CardContent>{item.title}</CardContent>
          </ItemCard>
        ))}

        {/* 
          If loaded items is less than total count,
          render a hidden element. 
          Fetch more when scroll to bottom 
        */}
        {data?.items.newsItems.length < data?.items.count && (
          <Waypoint onEnter={loadMore} />
        )}
      </ItemsWrapper>
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

const Titlebar = styled.div`
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
  /* If z-index is not set, Avatar will be on top of toolbar */
  z-index: 10;
  height: 50px;
  width: 100%;
  padding-left: 24px;
  padding-right: 24px;
  background-color: #666666;
  display: flex;
  align-items: center;
  position: sticky;
  top: 0px;
  & > * {
    margin-right: 10px;
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

const ItemsWrapper = styled.div`
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
  margin: 10px;
  flex: 0 0 400px;
  @media screen and (max-width: 960px) {
    /* margin-bottom: 20px;
    margin-right: 0px; */
    flex: 0 0 auto;
  }
`;

const SubheaderRow = styled.span`
  display: flex;
  align-items: center;
`;

const Bullet = styled.span`
  display: inline-block;
  margin: 0 4px;
`;
