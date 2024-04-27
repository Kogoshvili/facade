import Header from 'server/layouts/header'
import Body from 'server/layouts/body'
import ProductList from 'server/components/ProductList'
import Wrapper from 'server/components/Wrapper'
import NavBar from 'server/components/NavBar'


function ShopPage() {
    return (
        <html>
            <Header name="Shop" />
            <Body>
                <NavBar />
                <Wrapper />
                <ProductList />
            </Body>
        </html>
    )
}

export default ShopPage

