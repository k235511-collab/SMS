import { Module } from '@nestjs/common'
import { TransportController } from './transport.controller'
import { RoutesService } from './routes.service'
import { VehiclesService } from './vehicles.service'

@Module({
    controllers: [TransportController],
    providers: [RoutesService, VehiclesService],
    exports: [RoutesService, VehiclesService],
})
export class TransportModule { }
