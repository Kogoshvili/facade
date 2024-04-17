import { signal, ISignal, Injectable } from 'app/facade/server'

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
