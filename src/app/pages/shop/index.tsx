import Modal from './components/Modal'
import ProductList from './components/ProductList'

function Page() {
    return (
        <html>
            <head>
                <title>Home</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <script async src="./static/client.js" type="text/javascript"></script>
            </head>
            <body style="visibility: visible;">
                <ProductList />
                <Modal />
            </body>
        </html>
    )
}

export default Page

