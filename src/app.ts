import './utils/load-env'
import 'reflect-metadata';
import { MikroORM, RequestContext, DateType } from '@mikro-orm/core';
import mikroConfig from './mikro-orm.config';
import express, { ErrorRequestHandler } from 'express';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import { TaskResolver } from './resolvers/task';
import { ApolloContext, TaskRequest, UserRequest } from './types';
import cors from 'cors';
import TaskService from './service/task-service-impl';
import UserService from './service/user-service-impl';
import './utils/authenticate'
import { DateTypeScalar } from './scalars/date-time';
import multer from 'multer';
import { verifyMiddleware } from './utils/authenticate'

export const NODE_ENV = process.env.NODE_ENV
export const initialize = async () => {
    const orm = await MikroORM.init(mikroConfig);
    
    if(NODE_ENV === 'test'){
        await orm.getSchemaGenerator().dropSchema(undefined, true);
    }
    await orm.getMigrator().up();

    const taskService = new TaskService(orm.em);
    const userService = new UserService(orm.em);

    const app = express();
    app.use(cors({
        origin: 'http://localhost:3000',
        credentials: true
    }))

    multer({ dest: 'src/public' })
    app.use(express.static('src/public'));

    verifyMiddleware(app);

    app.use((_req, _res, next) => {
        RequestContext.create(orm.em, next);
    });
      
    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [TaskResolver],
            validate: false,
            scalarsMap: [{ type: DateType, scalar: DateTypeScalar }],
        }),
        context: ({req, res}): ApolloContext => ({ 
            services: {
                userService, 
                taskService
            }, 
            req, 
            res
        })
    });

    apolloServer.applyMiddleware({ app })

    return app;
}