import Header from 'layouts/header'
import Body from 'layouts/body'
import ProductList from 'components/ProductList'
import Wrapper from 'components/Wrapper'


function ShopPage() {
    return (
        <html>
            <Header name="Shop" />
            <Body>
                <Wrapper />
                <ProductList />
            </Body>
        </html>
    )
}

export default ShopPage

