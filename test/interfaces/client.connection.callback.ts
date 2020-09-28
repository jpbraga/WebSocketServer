import { ClientConnectionEvents } from './client.connection.events'

export interface ClientConnectionCallback {
    (status:ClientConnectionEvents): void
}