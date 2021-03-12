export interface ProbeData {
    serverId: string,
    ip: string,
    restPort: number,
    restAddress: string,
    websocketAddress: string,
    websocketPort: number,
    connectedClients: number
}