import React from 'react';
function Pagination({id}) {
    const onClick = (page) => {
        fetch(`/product-list?page=${page}`)
            .then(res => res.text())
            .then(html => {
                const container = document.getElementById(id);
                container.innerHTML = html;
            });
    }

    return (
        <div>
            {
                [1, 2, 3, 4, 5].map(page => (
                    <button onClick={onClick} key={page}>{page}</button>
                ))
            }
        </div>
    );
}

export default Pagination;
