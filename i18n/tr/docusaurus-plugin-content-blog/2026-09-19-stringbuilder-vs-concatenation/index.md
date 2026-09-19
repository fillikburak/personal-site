---
title: StringBuilder ve string birleştirme
authors: [burak]
tags: [dotnet, memory]
---

Bir döngüde `+=` ile string oluşturmanın neden karesel (quadratic) maliyetli olduğu ve `StringBuilder`'ın neden sadece bir stil tercihi olmadığı üzerine notlar.

{/* truncate */}

## String'ler immutable (değiştirilemez)

.NET'te her `string` immutable — bir kez oluşturulduktan sonra içeriği asla değişmez. `a += "x"` yazmak, `a`'nın mevcut karakter tamponunu değiştirmiyor; eski içerik + eklenen karakteri barındıran **yepyeni** bir string allocate edip `a`'yı o yeni objeye yönlendiriyor. Eski string objesi atılıyor.

Bu doğrudan kanıtlanabilir:

```csharp
string a = "hello";
string d = a;              // d ve a AYNI objeye işaret ediyor
d += " world";              // d artık YENİ bir objeye işaret ediyor
Console.WriteLine(a);       // hâlâ "hello" — dokunulmamış
```

Eğer `a` ve `d` aynı objeyi paylaşsaydı ve o obje yerinde değiştirilseydi, `a` da `"hello world"` gösterirdi. Göstermiyor — `+=`'in asla mutasyona uğratmadığının, sadece yeniden atama yaptığının kanıtı.

## Neden immutable — sadece "öyle tasarlanmış" değil

Birleşen üç sebep var:

- **String interning.** CLR, aynı string literal'lerini bellek tasarrufu için paylaşır (`"hello"` iki farklı yerde kullanılsa bile genelde *aynı* obje). Mutable olsaydı, bir literal'i değiştirmek onu kullanan her yeri sessizce bozardı.
- **Dictionary/HashSet anahtarları.** String'ler sürekli hash anahtarı olarak kullanılır. Eklendikten sonra değişen bir anahtar, hash tablosunun iç tutarlılığını bozar — kayıt bir daha bulunamaz.
- **Thread safety.** Immutable bir obje, hiçbir kilitlemeye gerek kalmadan thread'ler arasında paylaşılabilir — çünkü okuyan biri, altından bir şeyin değişmesinden korkmasına gerek yok.

## Maliyet, ölçülmüş hâliyle

20.000 karakterlik bir string'i iki yöntemle oluşturmak, `Release` modda:

```
--- döngüde string += ---
Süre: 30ms
Gen0: 47  Gen1: 4  Gen2: 0

--- StringBuilder ---
Süre: 0ms
Gen0: 47  Gen1: 4  Gen2: 0   ← değişmedi
```

`+=` döngüsü tek başına 47 gen0 koleksiyonu ve 4 gen1 terfisi tetikledi — çünkü 20.000 iterasyonun her biri eski string'i atıp, biraz daha uzun yeni bir tane allocate ediyor, ve **önceki tüm karakterleri yeniden kopyalıyor.** n ekleme için toplamda O(n²) kopyalama demek.

`StringBuilder` aynı işi (20.000 karakter ekleme) yaptı ve GC sayaçları hiç kıpırdamadı. İç tamponu parça parça büyüyor (taşınca kabaca ikiye katlanarak), yani her ekleme için değil, toplamda sadece birkaç kez yeniden allocate ediyor.

## Çıkarımlar

- Döngüde `+=`: O(n²) — toplam iş, iterasyon sayısıyla karesel büyür.
- `StringBuilder`: O(n) — tampon büyümesi sayesinde amortize sabit zamanlı ekleme.
- Eşik noktası "sadece büyük string'ler" değil — küçük döngülerde bile (birkaç düzine iterasyon) `+=`'in yarattığı GC baskısı ölçülebilir, `StringBuilder` bunu tamamen ortadan kaldırıyor.
