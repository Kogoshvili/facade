function getProducts(page) {
    if (!page || page === 1) return [
        { id: 1, name: 'Product 1' },
        { id: 2, name: 'Product 2' }
    ];

    if (page === 2) return [
        { id: 3, name: 'Product 3' },
        { id: 4, name: 'Product 4' }
    ];

    return [];
}

export { getProducts };
