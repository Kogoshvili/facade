import { Injectable } from 'app/facade/server/Injection'
import { signal, ISignal } from 'facade/server/Signals'

@Injectable()
class ModalService {
    modal: ISignal<string|null> = signal(null)

    constructor() {}

    openModal(data: any) {
        this.modal(data)
    }

    closeModal() {
        this.modal(null)
    }
}

export default ModalService
