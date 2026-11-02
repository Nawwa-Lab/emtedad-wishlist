import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { isUUID } from 'class-validator'
import { WishFamily } from '../database/entities/wish.entity'
import { BrowseWishesDto, CreateWishDto, UpdateWishDto } from './dto/wish.dto'
import { Actor, WishesService } from './wishes.service'

@ApiTags('wishes')
@Controller('wishes/:family')
export class WishesController {
  constructor(private readonly service: WishesService) {}
  private actor(userId: string, orgId: string | undefined, role: string): Actor {
    if (!isUUID(userId) || (orgId && !isUUID(orgId)))
      throw new BadRequestException('Invalid identity headers')
    return { userId, orgId, role }
  }

  @Get()
  @ApiOperation({ summary: 'Browse active wishes' })
  browse(
    @Param('family', new ParseEnumPipe(WishFamily)) family: WishFamily,
    @Query() query: BrowseWishesDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-org-id') orgId: string | undefined,
    @Headers('x-user-role') role: string,
  ) {
    return this.service.browse(family, query, this.actor(userId, orgId, role))
  }

  @Get('mine')
  @ApiOperation({ summary: 'List wishes proposed or endorsed by the current actor' })
  mine(
    @Param('family', new ParseEnumPipe(WishFamily)) family: WishFamily,
    @Headers('x-user-id') userId: string,
    @Headers('x-org-id') orgId: string | undefined,
    @Headers('x-user-role') role: string,
  ) {
    return this.service.mine(family, this.actor(userId, orgId, role))
  }

  @Get('categories')
  @ApiOperation({ summary: 'List active wish categories' })
  categories(
    @Param('family', new ParseEnumPipe(WishFamily)) family: WishFamily,
    @Headers('x-user-id') userId: string,
    @Headers('x-org-id') orgId: string | undefined,
    @Headers('x-user-role') role: string,
  ) {
    return this.service.categories(family, this.actor(userId, orgId, role))
  }

  @Get(':id')
  findOne(
    @Param('family', new ParseEnumPipe(WishFamily)) family: WishFamily,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-org-id') orgId: string | undefined,
    @Headers('x-user-role') role: string,
  ) {
    return this.service.findOne(family, id, this.actor(userId, orgId, role))
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('family', new ParseEnumPipe(WishFamily)) family: WishFamily,
    @Body() dto: CreateWishDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-org-id') orgId: string | undefined,
    @Headers('x-user-role') role: string,
  ) {
    return this.service.create(family, dto, this.actor(userId, orgId, role))
  }

  @Put(':id')
  update(
    @Param('family', new ParseEnumPipe(WishFamily)) family: WishFamily,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWishDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-org-id') orgId: string | undefined,
    @Headers('x-user-role') role: string,
  ) {
    return this.service.update(family, id, dto, this.actor(userId, orgId, role))
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('family', new ParseEnumPipe(WishFamily)) family: WishFamily,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-org-id') orgId: string | undefined,
    @Headers('x-user-role') role: string,
  ) {
    return this.service.remove(family, id, this.actor(userId, orgId, role))
  }

  @Post(':id/endorse')
  endorse(
    @Param('family', new ParseEnumPipe(WishFamily)) family: WishFamily,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-org-id') orgId: string | undefined,
    @Headers('x-user-role') role: string,
  ) {
    return this.service.endorse(family, id, this.actor(userId, orgId, role))
  }

  @Delete(':id/endorse')
  unendorse(
    @Param('family', new ParseEnumPipe(WishFamily)) family: WishFamily,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-org-id') orgId: string | undefined,
    @Headers('x-user-role') role: string,
  ) {
    return this.service.unendorse(family, id, this.actor(userId, orgId, role))
  }

  @Get(':id/endorsers')
  endorsers(
    @Param('family', new ParseEnumPipe(WishFamily)) family: WishFamily,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-org-id') orgId: string | undefined,
    @Headers('x-user-role') role: string,
  ) {
    return this.service.endorsers(family, id, this.actor(userId, orgId, role))
  }
}
