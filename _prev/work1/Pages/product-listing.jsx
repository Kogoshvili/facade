import React from 'react';
import Pagination from "../Components/pagination";
import ProductList from "../Templates/product-list";
import Page from "../page";

function ProductListing() {
  return (
    <div>
      <h1>Product Listing Page</h1>
      <div>
        <ProductList id='test' />
        <Pagination id='test' />
      </div>
    </div>
  );
}

export default Page('/', ProductListing)
