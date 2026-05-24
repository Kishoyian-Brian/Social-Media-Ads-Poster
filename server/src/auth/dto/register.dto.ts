import { IsEmail, IsString, Length, MinLength } from 'class-validator'

export class RegisterDto {
  @IsString()
  @MinLength(2)
  name!: string

  @IsEmail()
  email!: string

  @MinLength(6)
  password!: string
}

export class VerifyRegisterDto {
  @IsEmail()
  email!: string

  @IsString()
  @Length(6, 6)
  code!: string
}
