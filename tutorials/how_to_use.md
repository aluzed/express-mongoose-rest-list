## Tutorial

### Build Your Route

```javascript
// In your model
const ItemSchema = new mongoose.Schema({
  ...
})

// Define the list of fields that you want to apply the filter on
ItemSchema.statics.searchable = function() {
  return [
    'field1', 
    'field2'
  ];
}

mongoose.model('Items', ItemSchema);

// In your router
...
const restList = require('express-mongoose-rest-list');
const app = express();
const Items = mongoose.model('Items');
const router = express.Router();

restList(router, Items, '/list_items',
[
  // Session middleware
  (req, res, next) => {
    if (!req.user)
      return res.status(403).send('Forbidden');

    return next();
  }
],
{
  defaultLimit: 5, // 5 items per page
  searchParams: { enabled: true }, // get only enabled items
  defaultFields: { label: 1, created: 1 }, // fields
  defaultQueryOptions: { skip: 3 } // <- Not recommended
})

app.use('/', router);

app.listen(3000);
```

### Call Your Route

```
# normal list with 10 items
curl http://localhost:3000/list_items

# response 
{
  results: [{...}, {...}, {...}, {...}, {...}, {...} ...],
  currentPage: 1,
  limit: 10,
  totalPages: 2,
  totalResults 15
}

# change the limit
curl http://localhost:3000/list_items?limit=2

# response
{
  results: [{...}, {...}],
  currentPage: 1,
  limit: 2,
  totalPages: 8,
  totalResults 15
}

# change page
curl http://localhost:3000/list_items?page=2

# response
{
  results: [{...}, {...}, {...}, {...}, {...}],
  currentPage: 2,
  limit: 10,
  totalPages: 2,
  totalResults 15
}

# filter where field1 or field2 contains /lorem/
curl http://localhost:3000/list_items?filter=lorem
{
  results: [{...}, {...}],
  currentPage: 1,
  limit: 10,
  totalPages: 1,
  totalResults 2
}
```