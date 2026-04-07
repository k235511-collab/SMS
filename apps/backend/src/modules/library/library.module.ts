import { Module } from '@nestjs/common'
import { BooksController } from './books.controller'
import { BooksService } from './books.service'
import { IssuesService } from './issues.service'

@Module({
    controllers: [BooksController],
    providers: [BooksService, IssuesService],
    exports: [BooksService, IssuesService],
})
export class LibraryModule { }
