# Cursor-Based Pagination for Admin Reviews

## What it is

Cursor-based pagination returns a small page of records and a pointer to the
last record. The client sends that pointer back to request the next page.

```text
GET /api/v1/admin/reviews?limit=25
GET /api/v1/admin/reviews?limit=25&cursor=<nextCursor>
```

The cursor is not a page number. It represents a stable position in the
current sort order, usually using the last record's sort value and `_id`.

## Why it is needed

The admin review list may grow from thousands to hundreds of thousands of
records. Offset pagination (`skip(50000)`) becomes slower as the offset grows
and can produce duplicates or missing records when reviews are added or
deleted while an administrator is paging.

Cursor pagination is better for this list because it:

- avoids scanning and skipping a large number of documents;
- works well with MongoDB indexes;
- continues from a deterministic position;
- supports a simple “Load more” experience; and
- limits the amount of data returned in each request.

## Why this project chose it

The review page is an administrative list that can grow quickly, and it does
not need random access to “page 47”. The useful action is moving forward
through the newest, oldest, or rating-sorted results. A cursor therefore gives
better scalability and a simpler UI than numbered pages.

## How the backend works

The API caps the requested page size and chooses a supported sort order:

```js
const limit = Math.min(Number.parseInt(req.query.limit, 10) || 25, 100);
const sort = { createdAt: -1, _id: -1 };
```

It requests one extra record. The extra record tells the API whether another
page exists, but is not returned to the client:

```js
const rows = await Review.find(filter)
  .sort(sort)
  .limit(limit + 1)
  .lean();

const hasNextPage = rows.length > limit;
const reviews = rows.slice(0, limit);
```

For the next request, the API applies a range condition after the cursor.
The `_id` tie-breaker matters because multiple reviews can have the same
`createdAt` or rating:

```js
filter.$and = [{
  $or: [
    { createdAt: { $lt: cursor.createdAt } },
    { createdAt: cursor.createdAt, _id: { $lt: cursor.id } },
  ],
}];
```

The response contains the records and paging metadata:

```js
res.json({
  success: true,
  reviews,
  hasNextPage,
  nextCursor,
});
```

The cursor is encoded before being sent to the browser. This keeps its
internal structure out of normal UI handling; it is a position marker, not a
security token.

Useful supporting indexes include the sort fields and the tie-breaker:

```js
reviewSchema.index({ createdAt: -1, _id: -1 });
reviewSchema.index({ rating: -1, _id: -1 });
```

## How the frontend works

The page stores the cursor returned by the API:

```js
const [nextCursor, setNextCursor] = useState(null);
const [hasNextPage, setHasNextPage] = useState(false);
```

Clicking “Load more” sends the cursor and appends the next page instead of
replacing the current list:

```js
loadReviews({ append: true, pageCursor: nextCursor });

setReviews((current) => append
  ? [...current, ...data.reviews]
  : data.reviews
);
```

Changing search, rating, or sort starts a fresh request without the old
cursor. This is important because a cursor is valid only for the same filter
and sort order that created it.

## What to test

Check that:

1. The first request returns no cursor when all results fit in one page.
2. A large result set returns at most the requested limit.
3. “Load more” returns the next records without duplicates.
4. The final page sets `hasNextPage` to `false`.
5. Newest, oldest, highest-rated, and lowest-rated sorting all continue in
   the correct direction.
6. Reviews with equal timestamps or ratings are not skipped, using `_id` as
   the tie-breaker.
7. Changing a filter resets the list rather than using a cursor from the old
   filter.
8. Invalid cursors return a controlled client error instead of returning
   arbitrary records.

## Important limitation

Cursor pagination is ideal for sequential browsing, but it does not provide
direct navigation to an arbitrary page. If the product later needs page
numbers, reporting exports, or stable historical snapshots, those needs should
be designed separately rather than weakening the cursor implementation.
