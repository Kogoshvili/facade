import express from 'express';
import ProductList from './Templates/product-list.jsx';
import React from 'react';
import ProductListing from './Pages/product-listing.jsx';


const app = express();
const port = 3000;

ProductListing.call(app)

ProductList.call(app)

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
