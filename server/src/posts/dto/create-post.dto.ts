import { IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator'

export class CreatePostDto {
  @IsNotEmpty()
  @IsString()
  content!: string

  @IsOptional()
  @IsString()
  imageUrl?: string

  @IsOptional()
  @IsDateString()
  scheduledAt?: string
}
