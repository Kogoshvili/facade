import { Injectable } from 'app/facade/server/Injection'
import signal, { Signal } from 'facade/server/Signals'

@Injectable()
class ModalService {
    modal: Signal<string|null> = signal(null)

    openModal(data: any) {
        this.modal.set(data)
    }

    closeModal() {
        this.modal.set(null)
    }
}

export default ModalService
