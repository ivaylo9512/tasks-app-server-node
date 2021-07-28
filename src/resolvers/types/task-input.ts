import { InputType, Field } from "type-graphql"

@InputType()
export class TaskInput {
    @Field()
    name: string

    @Field()
    state: string

    @Field({ nullable: true })
    from?: string

    @Field({ nullable: true })
    to?: string

    @Field({ nullable: true })
    alertAt?: Date

    @Field({ nullable: true })
    eventDate?: string
}