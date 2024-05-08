import Header from 'server/layouts/header'
import Body from 'server/layouts/body'
import ProductList from 'server/components/ProductList.facade'
import Wrapper from 'server/components/Wrapper'
import NavBar from 'server/components/NavBar.facade'


function ShopPage() {
    return (
        <html>
            <Header name="Shop - Home" />
            <Body>
                <NavBar />
                <Wrapper />
                <ProductList />
            </Body>
        </html>
    )
}

export default ShopPage

