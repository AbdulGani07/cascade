package com.acme.app
import com.acme.shared.Platform as SharedPlatform
import kotlin.collections.List
fun main() {
  val platforms: List<SharedPlatform> = listOf(SharedPlatform("android"))
  println(platforms)
}
