import Header from 'server/layouts/header'
import Body from 'server/layouts/body'
import Wrapper from 'server/components/Wrapper'
import NavBar from 'server/components/NavBar.facade'
import Product from 'server/components/Product.facade'


function ShopPage(req) {
    return (
        <html>
            <Header name="Shop - PDP" />
            <Body>
                <NavBar />
                <Product id={req.query.id} />
            </Body>
        </html>
    )
}

export default ShopPage

