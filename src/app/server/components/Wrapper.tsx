import { AComponent } from 'facade/server'
import Modal from './Modal'

class Wrapper extends AComponent<any> {
    render() {
        return (
            <div>
                <Modal />
            </div>
        )
    }
}

export default Wrapper
