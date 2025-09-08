import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsInt, Min } from 'class-validator';


export const StageEnum = [
  'LIC_DOCS_IN_SERVICE',
  'WAITING_PSY',
  'PSY_IN_SERVICE',
  'WAITING_LIC_RETURN',
  'COMPLETED',
  'CANCELLED',
] as const;


export type Stage = typeof StageEnum[number];

export class CreateTicketDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  fullName: string;

  @ApiProperty({ enum: StageEnum, enumName: 'Stage', example: 'LIC_DOCS_IN_SERVICE' })
  @IsEnum(StageEnum)
  stage: Stage;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  assignedBox?: number;

  @ApiProperty({ example: 'userId123', required: false })
  @IsOptional()
  @IsString()
  assignedUserId?: string;
}
