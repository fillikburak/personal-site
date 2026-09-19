---
title: struct vs class
authors: [burak]
tags: [dotnet, memory]
---

`struct` ile `class` arasındaki gerçek fark — kopyalama semantiği, verinin gerçekte nerede durduğu, boxing, ve hangisini ne zaman seçmeli — üzerine notlar.

{/* truncate */}

## Asıl fark kopyalama, yer değil

`class` bir reference type: bir değişken, heap'teki bir objeye giden 8 byte'lık bir işaretçi tutar. `struct` bir value type: bir değişken **değerin tamamını** tutar. Bu doğrudan kanıtlanabilir:

```csharp
var classPoint1 = new PointClass(1, 1);
var classPoint2 = classPoint1;   // referans kopyalandı — ikisi de AYNI objeye işaret ediyor
classPoint2.X = 99;
// classPoint1.X şimdi de 99 — tek objeyi paylaşıyorlar

var structPoint1 = new PointStruct(1, 1);
var structPoint2 = structPoint1; // TÜM değer kopyalandı — iki bağımsız kopya
structPoint2.X = 99;
// structPoint1.X hâlâ 1 — dokunulmamış
```

## "Value type" her zaman "stack'te" demek değil

Bu yaygın bir yanlış anlama. Bir struct'ın verisi, onu **içeren şeye** bağlı olarak durur — sabit bir yerde değil:

| Struct nerede? | Nerede durur? |
|---|---|
| Bir metodun içindeki tek başına yerel değişken | Stack |
| Bir dizinin elemanı | Heap (dizinin bloğunun içine gömülü — diziler her zaman heap objesidir) |
| Bir class'ın field'ı | Heap (o class örneğinin içine gömülü) |
| `object`'e ya da bir interface'e atanırsa (**boxing**) | Heap — yepyeni, bağımsız bir kopya |

Bir `PointStruct[]` dizisi heap'te (tüm diziler öyle), ve struct'lar doğrudan o tek bloğun içine gömülü — eleman başına ayrı allocation yok. Bir `PointClass[]` dizisi de heap'te, ama sadece sabit boyutlu referanslar tutuyor; her eleman, başka bir yerde **ayrı** bir heap allocation'ı.

1.000.000 eleman için ölçülmüş, `Release` modda:

```
--- class Point[] ---
Allocation: 49ms
Gen0: 3  Gen1: 2  Gen2: 1
Bellek: 48.844.896 byte

--- struct Point[] ---
Allocation: 1ms
Gen0: 3  Gen1: 2  Gen2: 1   ← değişmedi
Bellek: 56.844.920 byte     (+8MB — sadece dizinin kendisi)
```

`class` gerçek GC baskısı yarattı (1.000.000 ayrı obje allocation'ı). `struct` hiç yaratmadı — dizi tek, bitişik bir blok, doldurmak sadece var olan hücrelere byte yazmak.

## Boxing: fark edilmesi kolay kaçan bir heap allocation'ı

Bir struct'ı `object`'e (ya da bir interface'e) atamak, bağımsız bir heap kopyası oluşturur:

```csharp
var s = new PointStruct(1, 1);
object boxed = s;  // boxing — yeni heap kopyası
s.X = 99;
// boxed hâlâ (1, 1) gösteriyor — bağımsız olduğu kanıtlandı
```

Maliyet gerçek ve yanlışlıkla tetiklenmesi kolay (`List<object>`, generic olmayan koleksiyonlar, interface parametreleri):

```
List<PointStruct> (boxing yok):  11ms,  0 GC koleksiyonu,  8.069.512 byte
List<object> (her eleman boxed): 36ms,  Gen0:3 Gen1:2 Gen2:1,  48.837.664 byte
```

Boxed struct'lar yukarıdaki `class` dizisiyle **birebir** aynı davranıyor — çünkü boxing arka planda gerçekten de bunu yapıyor: değeri bir heap objesine sarıyor.

## Stack vs heap, bir seviye yukarıdan

Bir heap objesinin boyutu, dizinin sabit genişlikteki hücrelerinin tutabileceği bir formda bilinmek zorunda. Referanslar, neye işaret ettiklerinden bağımsız olarak her zaman aynı boyutta (8 byte) — class örneklerinin boyutları çok farklı olsa bile tek tip bir dizide durabilmelerinin sebebi tam olarak bu: dizi objeyi hiç tutmuyor, sadece aynı boyuttaki bir işaretçiyi tutuyor. Bir `struct[]` aynı şekilde farklı boyutları karıştıramaz, çünkü dizi veriyi doğrudan gömüyor.

Thread başına stack'ler de burada devreye giriyor: her thread'in kendi bağımsız stack bölgesi var, istediğin gibi boyutlandırabiliyorsun. 64KB'lık bir stack'te recursion, ~800 derinlikte taştı; aynı recursion default thread stack'inde ~104.500 derinliğe ulaştı — kodda başka hiçbir şey değişmeden, sadece stack boyutundan kaynaklanan ~100 kat fark.

## Hangisini ne zaman kullanmalı

**`struct` kullan, eğer:** tip tek bir küçük değeri temsil ediyorsa (bir nokta, bir renk, bir para miktarı), immutable ise, kimliği yoksa, ve **çok sayıda** oluşturacaksan — özellikle dizilerde ya da hot loop'larda. Microsoft'un kuralı: ~16 byte'ın altında tut, çünkü büyük struct'lar her kopyalamayı (atama, parametre geçme) orantılı olarak pahalılaştırır.

**`class` kullan, eğer:** tipin kimliği varsa (aynı field değerlerine sahip iki örnek bile kavramsal olarak farklı olabilir — bir `Customer`, bir `Order`), daha büyükse, kalıtım/polymorphism gerekiyorsa, ya da referanslar üzerinden gözlemlenmesi gereken paylaşılan mutable bir durumu temsil ediyorsa (bir cache, bir servis, DI'a kayıtlı herhangi bir şey).

Varsayılan olarak `class` kullan. Sadece profiling, allocation maliyetinin gerçekten önemli olduğunu gösterdiğinde `struct`'a geç.
