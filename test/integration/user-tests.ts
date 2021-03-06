import request from 'supertest';
import { getToken } from '../../src/utils/jwt';
import { app } from './sequential.test';
import UserInput from '../../src/resolvers/types/user-input';


const [secondUser, thirdUser, forthUser, fifthUser]: UserInput[] = Array.from({length: 4}).map((_user, i) => ({
    id: i + 2,
    role: 'user'
}))

const admintUser = {
    id: 1,
    role: 'admin'
}

export const admintToken = 'Bearer ' + getToken(admintUser)
export const secondToken = 'Bearer ' + getToken(secondUser)
export const thirdToken = 'Bearer ' + getToken(thirdUser)
const forthToken = 'Bearer ' + getToken(forthUser)

let createManyMutation = (users: UserInput[]) => ({
    query: `mutation createUsers($users: [UserInput!]!){
        createUsers(users: $users){
            id,
            role
        }
    }`,
    operationName: 'createUsers',
    variables: {
        users
    }
});

let createDeleteMutation = (id: number) => ({
    query: `mutation deleteUser($id: Int!){
        deleteUser(id: $id)
    }`,
    operationName: 'deleteUser',
    variables: {
        id
    }
});

let createUserByIdQuery = (id: number) => ({
    query: `query userById($id: Int!){
        userById(id: $id){
            id,
            role
        }
    }`,
    operationName: 'userById',
    variables: {
        id
    }
});

let registerMutation = {
    query: `mutation register{
            register{
                id,
                role
            }
    }`,
    operationName: 'register',
};

let loginMutation = {
    query: `mutation login{
            login{
                id,
                role
            }
    }`,
    operationName: 'login',
};

const userTests = () => {
    it('should register user with token from auth server', async() => {
        const res = await request(app)
            .post('/graphql')
            .set('Authorization', admintToken)
            .send(registerMutation);

        expect(res.body.data.register).toEqual(admintUser);
    })

    it('should loging with token from auth server when user is present', async() => {
        const res = await request(app)
            .post('/graphql')
            .set('Authorization', admintToken)
            .send(loginMutation);

        expect(res.body.data.login).toEqual(admintUser);
    })
    
    it('should register when loging with token from auth server when user is not present', async() => {
        const res = await request(app)
            .post('/graphql')
            .set('Authorization', secondToken)
            .send(loginMutation);

        expect(res.body.data.login).toEqual(secondUser);
    })

    it('should return error when register from token with user that already exists', async() => {
        const res = await request(app)
            .post('/graphql')
            .set('Authorization', secondToken)
            .send(registerMutation);

        expect(res.body.errors[0].message).toBe('User with id: 2 already exists.');
    })

    it('should create users when user from token is admin', async() => {
        const res = await request(app)
            .post('/graphql')
            .set('Authorization', admintToken)
            .send(createManyMutation([thirdUser, forthUser, fifthUser]));
            
        expect(res.body.data.createUsers).toEqual([thirdUser, forthUser, fifthUser]);
    })

    it('should return error when creating user when user already exists', async() => {
        const res = await request(app)
            .post('/graphql')
            .set('Authorization', admintToken)
            .send(createManyMutation([thirdUser]));
            
        expect(res.body.errors[0].message).toBe('User with id: 3 already exists.');
    })

    it('should return Unauthorized when creating users with user that is not admin', async() => {
        const res = await request(app)
            .post('/graphql')
            .set('Authorization', secondToken)
            .send(createManyMutation([thirdUser, forthUser]));
            
        expect(res.body.errors[0].message).toBe('Unauthorized.');
    })

    it('should delete user when deleting from same user', async() => {
        const res = await request(app)
            .post('/graphql')
            .set('Authorization', forthToken)
            .send(createDeleteMutation(4));

        expect(res.body.data.deleteUser).toEqual(true);
    })

    it('should return unauthorized when deleting from same user', async() => {
        const res = await request(app)
            .post('/graphql')
            .set('Authorization', secondToken)
            .send(createDeleteMutation(5));
            
        expect(res.body.errors[0].message).toEqual('Unauthorized.');
    })

    it('should delete when deleting from user that is admin', async() => {
        const res = await request(app)
            .post('/graphql')
            .set('Authorization', admintToken)
            .send(createDeleteMutation(5));
            
        expect(res.body.data.deleteUser).toEqual(true);
    })

    it('should return error when deleting nonexistent user', async() => {
        const res = await request(app)
            .post('/graphql')
            .set('Authorization', admintToken)
            .send(createDeleteMutation(4));
            
        expect(res.body.errors[0].message).toEqual(`User with id: 4 is not found.`);
    })

    it('should return user when userById with same token id', async() => {
        const res = await request(app)
            .post('/graphql')
            .set('Authorization', thirdToken)
            .send(createUserByIdQuery(3));
            
        expect(res.body.data.userById).toEqual(thirdUser);
    })

    it('should return error when userById with different user that is not admin', async() => {
        const res = await request(app)
            .post('/graphql')
            .set('Authorization', thirdToken)
            .send(createUserByIdQuery(2));
            
        expect(res.body.errors[0].message).toEqual('Unauthorized.');
    })

    it('should return user when userById with different user that is admin', async() => {
        const res = await request(app)
            .post('/graphql')
            .set('Authorization', admintToken)
            .send(createUserByIdQuery(2));

        expect(res.body.data.userById).toEqual(secondUser);
    })

    it('should return error when userById with nonexistent user', async() => {
        const res = await request(app)
            .post('/graphql')
            .set('Authorization', admintToken)
            .send(createUserByIdQuery(222));
            
        expect(res.body.errors[0].message).toEqual(`User not found.`);
    })
    
    it('should return error when userById wtihout token', async() => {
        const res = await request(app)
            .post('/graphql')
            .send(createUserByIdQuery(1))

        expect(res.body.errors[0].message).toBe('No auth token');
    })

    it('should return error when userById with incorrect token', async() => {
        const res = await request(app)
            .post('/graphql')
            .set('Authorization', 'Bearer incorrect token')
            .send(createUserByIdQuery(1))

        expect(res.body.errors[0].message).toBe('jwt malformed');
    })

    it('should return error when deleting user wtihout token', async() => {
        const res = await request(app)
            .post('/graphql')
            .send(createDeleteMutation(1))

        expect(res.body.errors[0].message).toBe('No auth token');
    })

    it('should return error when deleting user with incorrect token', async() => {
        const res = await request(app)
            .post('/graphql')
            .set('Authorization', 'Bearer incorrect token')
            .send(createDeleteMutation(1))

        expect(res.body.errors[0].message).toBe('jwt malformed');
    })


    it('should return error when creating user wtihout token', async() => {
        const res = await request(app)
            .post('/graphql')
            .send(createManyMutation([fifthUser]));

        expect(res.body.errors[0].message).toBe('No auth token');
    })

    it('should return error when creating user with incorrect token', async() => {
        const res = await request(app)
            .post('/graphql')
            .set('Authorization', 'Bearer incorrect token')
            .send(createManyMutation([fifthUser]))

        expect(res.body.errors[0].message).toBe('jwt malformed');
    })
} 
export default userTests;