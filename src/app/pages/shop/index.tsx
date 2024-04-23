import ProductList from './components/ProductList'
import Header from 'app/app/layout/header'
import Body from 'app/app/layout/body'
import Wrapper from './components/Wrapper'


function Page() {
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

export default Page

