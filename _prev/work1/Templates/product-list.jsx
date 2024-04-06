import React from 'react';
import Template from '../template.js';
import { getProducts } from '../Server/database.js';

function ProductList({ page, id }) {
    const products = getProducts(+page);

    return (
        <div id={id}>
            <h1>Product List</h1>
            <ul>
                {
                    products.map(product => (
                        <li key={product.id}>
                            {product.name}
                        </li>
                    ))
                }
            </ul>
        </div>
    );
}

export default Template('/product-list', ProductList);
